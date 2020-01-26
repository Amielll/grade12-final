let btnStart = document.getElementById('button button--start');
let btnHelp = document.getElementById('button button--help');
let btnAbout = document.getElementById('button button--about');
let txtHandle = document.getElementById('handle');

let btn = document.getElementsByClassName('button');

btn.disabled = true;
console.log(btn);
txtHandle.addEventListener('keypress', function () {

  if (txtHandle.length != 0) {
    btn.disabled = false;
  }

});

$(document).ready(function () {
  $("#btnStart").click(function () {
    sessionStorage.handle = txtHandle.value;
  });
});