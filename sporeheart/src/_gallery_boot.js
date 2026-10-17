(function () {
  var src = document.getElementById('three-module').textContent;
  var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  import(url).then(function (THREE) { window.G.gallery.boot(THREE); })
    .catch(function (e) { document.body.textContent = 'gallery boot failed: ' + (e && e.message); console.error(e); });
})();
