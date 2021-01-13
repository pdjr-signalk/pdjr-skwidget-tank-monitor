class TankMonitorWidget {

  static install(signalkClient, container=window.document.body) {
    return(new TankMonitorWidget(signalkClient, container));
  }

  constructor(signalkClient, container) {
    this.signalkClient = signalkClient;
    this.container = container;
    this.tanks = [];
    this.values = {};
    this.popup = { container: null, image: null, navleft: null, navright: null, selection: [ "graphs/day", "graphs/week", "graphs/month", "graphs/year" ] };

    var tankPaths = this.signalkClient.getAvailablePathsSync("^tanks\..*").reduce((a,p) => { var pn = p.substr(0, p.lastIndexOf('.')); if (!a.includes(pn)) a.push(pn); return(a); }, []);

    tankPaths.forEach(p => {
      var meta = this.signalkClient.getValueSync(p + ".currentLevel.meta");
      if ((meta) && (meta.displayFormat)) this.tanks.push({ path: p, meta: meta });
    });

    var tankChart = PageUtils.createElement('div', null, 'tankmonitorwidget', null, container);
    this.tanks.forEach(tank => tankChart.appendChild(this.makeTankBar(tank)));

    this.makePopup();
    this.container.appendChild(this.popup.container);
  }

  makeTankBar(tank) {
    var tankBar = PageUtils.createElement('div', tank.path, 'tankmonitorwidget-bar', null, null);
    tankBar.appendChild(this.makeTankCard(tank));
    tankBar.appendChild(this.makeTankGraph(tank));
    tankBar.addEventListener("click", (e) => {
      this.popup.image.src = this.popup.selection[0];
      this.popup.container.classList.remove('hidden');
    });
    return(tankBar);
  }

  makeTankCard(tank) {
    var tankCard = PageUtils.createElement('div', null, 'tankmonitorwidget-card', null, null);
    for (var i = 0; i < 10; i++) {
      var tankCardRegion = PageUtils.createElement('div', null, 'tankmonitorwidget-card-region', null, tankCard);
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
    this.signalkClient.getValue(tank.path + ".capacity", (v) => {
      tankCapacity.innerHTML = this.getAdjustedValue(v, tank.meta.displayFormat.factor, tank.meta.displayFormat.places);
    });
    this.signalkClient.onValue(
      tank.path + ".currentLevel",
      (v) => {
        tankLevel.innerHTML = this.getAdjustedValue(v * (tankCapacity.innerHTML / ((tank.meta.displayFormat.factor === undefined)?1:tank.meta.displayFormat.factor)), tank.meta.displayFormat.factor, tank.meta.displayFormat.places);
      }
    );
  }

  makeTankGraph(tank) {
    let tankGraph = PageUtils.createElement('div', null, 'tankmonitorwidget-graph', null, null);
    tankGraph.style.backgroundColor = (tank.meta.displayFormat.color !== undefined)?tank.meta.displayFormat.color:"#7f7f7f";
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
    this.popup.container = PageUtils.createElement('div', 'tankmonitorwidget-popup', 'hidden', null, null);
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
