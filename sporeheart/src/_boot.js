(function () {
  var src = document.getElementById('three-module').textContent;
  var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  import(url)
    .then(function (THREE) {
      document.getElementById('boot').remove();
      window.G.game.boot(THREE);
    })
    .catch(function (e) {
      document.getElementById('boot').textContent = 'boot failed: ' + (e && e.message);
      console.error(e);
    });
})();