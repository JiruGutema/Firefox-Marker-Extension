var px1 = document.getElementById("px1");
var px2 = document.getElementById("px2");
var px3 = document.getElementById("px3");
var px4 = document.getElementById("px4");

var slider1 = document.getElementById("pageMarker_thicknessSlider1");
var slider2 = document.getElementById("pageMarker_thicknessSlider2");
var slider3 = document.getElementById("pageMarker_thicknessSlider3");
var slider4 = document.getElementById("pageMarker_thicknessSlider4");

var colorSelect = document.getElementById("pageMarker_colorSelect");

chrome.storage.sync.get({
  penColor: '#FF0000',
  penThickness: 5,
  highlightThickness: 22,
  eraseThickness: 30,
  textSize: 20
}, function(items) {
  colorSelect.value = items.penColor;
  slider1.value = items.penThickness;
  slider2.value = items.highlightThickness;
  slider3.value = items.eraseThickness;
  slider4.value = items.textSize;
  px1.textContent = slider1.value + "px";
  px2.textContent = slider2.value + "px";
  px3.textContent = slider3.value + "px";
  px4.textContent = slider4.value + "px";
});

slider1.addEventListener("input", function() {
  px1.textContent = slider1.value + "px";
}, false);

slider2.addEventListener("input", function() {
  px2.textContent = slider2.value + "px";
}, false);

slider3.addEventListener("input", function() {
  px3.textContent = slider3.value + "px";
}, false);

slider4.addEventListener("input", function() {
  px4.textContent = slider4.value + "px";
}, false);

document.getElementById("save").onclick = save_options;

function save_options() {
  var penThickness = slider1.value;
  var highlightThickness = slider2.value;
  var eraseThickness = slider3.value;
  var textSize = slider4.value;
  var color = colorSelect.value;
  chrome.storage.sync.set({
    penColor: color,
    penThickness: penThickness,
    highlightThickness: highlightThickness,
    eraseThickness: eraseThickness,
    textSize: textSize
  }, function() {
    var status = document.getElementById('saved');
    status.textContent = "Options saved.";
    setTimeout(function() {
      status.textContent = "";
    }, 750);
  });
}
