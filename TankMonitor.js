class TankMonitor {

  /********************************************************************
   * The config object my include the following properties.
   *
   * config 
   *   Url referencing the JSON configuration file that should be used
   *   to configure the TankMonitor. Defaults to the relative url
   *   "config.json")
   * container
   *   The container within which the TankMonitor should be built. This
   *   can be an Element reference or a string containing an argument
   *   suitable for used with document.querySelector. Defaults to
   *   document.body. 
   */ 

  static install(signalkClient, container=window.document.body) {
    return(new TankMonitor(signalkClient, container));
  }

  /********************************************************************
   * Create a new TankMonitor instance.
   * @param client - SignalkClient instance connected to the host
   * server.
   * @param container - HTML entity in which the TankMonitor structure
   * should be built. This can be an Element reference or a query
   * string that will select the root container.
   * @param options - a copy of the configuration object extracted from
   * the plugin configuration file.
   */

  constructor(signalkClient, container) {
    this.signalkClient = signalkClient;
    this.container = container;
    this.tanks = [];
    this.values = {};
    this.popup = { container: null, image: null, navleft: null, navright: null, selection: [ "graphs/day", "graphs/week", "graphs/month", "graphs/year" ] };

    this.signalkClient.getEndpoints(endpoints => {
      endpoints
      .filter(endpoint => (endpoint.startsWith('tanks.')))
      .map(endpoint => (endpoint.substr(0, endpoint.lastIndexOf('.'))))
      .reduce((a,v) => { if (!a.includes(v)) a.push(v); return(a); }, [])
      .forEach(endpoint => {
        var meta = this.signalkClient.getValue(endpoint + ".currentLevel.meta");
        if (meta) {
          this.tanks.push({ path: endpoint, meta: meta });
        }
      });
    });

    var tankChart = PageUtils.createElement('div', null, 'tank-chart flex-container', null, container);
    this.tanks.forEach(tank => tankChart.appendChild(this.makeTankBar(tank)));

    this.makePopup();
    this.container.appendChild(this.popup.container);
  }

  makeTankBar(tank) {
    var tankBar = PageUtils.createElement('div', tank.path, 'tank-bar', null, null);
    tankBar.appendChild(this.makeTankCard(tank));
    tankBar.appendChild(this.makeTankGraph(tank));
    tankBar.addEventListener("click", (e) => {
      this.popup.image.src = this.popup.selection[0];
      this.popup.container.classList.remove('hidden');
    });
    return(tankBar);
  }

  makeTankCard(tank) {
    var tankCard = PageUtils.createElement('div', null, 'tank-card', null, null);
    for (var i = 0; i < 10; i++) {
      var tankCardRegion = PageUtils.createElement('div', null, 'tank-card-region', null, tankCard);
      if (i == 0) this.addNotification(tankCardRegion, tank);
      if (i == 9) this.addLegend(tankCardRegion, tank);
    }
    return(tankCard);
  }

  addLegend(container, tank) {
    let tankName = PageUtils.createElement('div', null, 'tankname', tank.meta.displayName, container);
    let tankData = PageUtils.createElement('div', null, 'tankdata', null, container);
    let tankLevel = PageUtils.createElement('span', null, 'tanklevel', null, tankData);
    tankData.appendChild(document.createTextNode(' / '));
    let tankCapacity = PageUtils.createElement('span', null, 'tankcapacity', null, tankData);
    this.signalkClient.getValue(tank.path + ".capacity", (v) => { tankCapacity.innerHTML = this.getAdjustedValue(v, tank.meta.displayFormat.factor, tank.meta.displayFormat.places); });
    this.signalkClient.registerCallback(
      tank.path + ".currentLevel",
      (v) => {
        tankLevel.innerHTML = this.getAdjustedValue(v * (tankCapacity.innerHTML / ((tank.meta.displayFormat.factor === undefined)?1:tank.meta.displayFormat.factor)), tank.meta.displayFormat.factor, tank.meta.displayFormat.places);
      }
    );
  }

  addNotification(container, tank) {
    container.classList.add('label');
    var notification = PageUtils.createElement('span', null, 'text alert hidden', null, container);
    this.signalkClient.registerCallback(
      tank.path + ".currentLevel",
      (v) => {
      }
    );
  }
   
  makeTankGraph(tank) {
    let tankGraph = PageUtils.createElement('div', null, 'tank-graph', null, null);
    if (tank.meta.displayFormat.color) tankGraph.style.backgroundColor = tank.meta.displayFormat.color;
    let tankGraphPercent = PageUtils.createElement('div', null, 'tank-graph-percent', "---", tankGraph);
    this.signalkClient.registerCallback(tank.path + ".currentLevel", (v) => {
      var percent = "" + Math.floor((v + 0.005) * 100) + "%";
      tankGraph.style.height = percent;
      tankGraphPercent.innerHTML = percent;
      if (v < 0.12) { tankGraphPercent.classList.add('hidden'); } else { tankGraphPercent.classList.remove('hidden'); }
    });
    return(tankGraph);
  }

  makePopup() {
    this.popup.container = PageUtils.createElement('div', 'popup', 'hidden', null, null);
    this.popup.navleft = PageUtils.createElement('div', null, 'nav left', null, this.popup.container);
    this.popup.navright = PageUtils.createElement('div', null, 'nav right', null, this.popup.container);
    this.popup.image = PageUtils.createElement('img', null, 'image', null, PageUtils.createElement('div', null, null, null, this.popup.container));
    this.popup.image.addEventListener('click', (e) => this.popup.container.classList.add('hidden'));
    this.popup.navleft.addEventListener('click', (e) => {
      this.popup.selection.unshift(this.popup.selection.pop());
      this.popup.image.src = this.popup.selection[0];
    });
    this.popup.navright.addEventListener('click', (e) => {
      this.popup.selection.push(this.popup.selection.shift());
      this.popup.image.src = this.popup.selection[0];
    });
  }


  getAdjustedValue(v, factor, places) {
    return((v * ((factor === undefined)?1:factor)).toFixed(((places === undefined)?0:places)));
  }


}