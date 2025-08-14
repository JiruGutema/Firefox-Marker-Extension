// Web Marker Extension - Options Page Script
// Handles user preference settings for the extension

// Get DOM elements
var penThicknessDisplay = document.getElementById("px1");
var highlightThicknessDisplay = document.getElementById("px2");
var eraseThicknessDisplay = document.getElementById("px3");
var textSizeDisplay = document.getElementById("px4");

var penThicknessSlider = document.getElementById("webMarker_thicknessSlider1");
var highlightThicknessSlider = document.getElementById("webMarker_thicknessSlider2");
var eraseThicknessSlider = document.getElementById("webMarker_thicknessSlider3");
var textSizeSlider = document.getElementById("webMarker_thicknessSlider4");

var colorPicker = document.getElementById("webMarker_colorSelect");

// Load saved preferences from storage
chrome.storage.sync.get({
  penColor: '#FF0000',
  penThickness: 5,
  highlightThickness: 22,
  eraseThickness: 30,
  textSize: 20
}, function(savedPreferences) {
  // Set UI elements to saved values
  colorPicker.value = savedPreferences.penColor;
  penThicknessSlider.value = savedPreferences.penThickness;
  highlightThicknessSlider.value = savedPreferences.highlightThickness;
  eraseThicknessSlider.value = savedPreferences.eraseThickness;
  textSizeSlider.value = savedPreferences.textSize;
  
  // Update display values
  penThicknessDisplay.textContent = penThicknessSlider.value + "px";
  highlightThicknessDisplay.textContent = highlightThicknessSlider.value + "px";
  eraseThicknessDisplay.textContent = eraseThicknessSlider.value + "px";
  textSizeDisplay.textContent = textSizeSlider.value + "px";
});

// Add event listeners for real-time display updates
penThicknessSlider.addEventListener("input", function() {
  penThicknessDisplay.textContent = penThicknessSlider.value + "px";
}, false);

highlightThicknessSlider.addEventListener("input", function() {
  highlightThicknessDisplay.textContent = highlightThicknessSlider.value + "px";
}, false);

eraseThicknessSlider.addEventListener("input", function() {
  eraseThicknessDisplay.textContent = eraseThicknessSlider.value + "px";
}, false);

textSizeSlider.addEventListener("input", function() {
  textSizeDisplay.textContent = textSizeSlider.value + "px";
}, false);

// Add save button event listener
document.getElementById("save").onclick = savePreferences;

// Save user preferences to storage
function savePreferences() {
  var preferences = {
    penColor: colorPicker.value,
    penThickness: penThicknessSlider.value,
    highlightThickness: highlightThicknessSlider.value,
    eraseThickness: eraseThicknessSlider.value,
    textSize: textSizeSlider.value
  };
  
  chrome.storage.sync.set(preferences, function() {
    // Show success message
    var statusElement = document.getElementById('saved');
    statusElement.textContent = "Options saved successfully!";
    
    // Clear message after 750ms
    setTimeout(function() {
      statusElement.textContent = "";
    }, 750);
  });
}