export default function showError(err) {
  console.log(err);
  const pre = document.createElement('pre');
  pre.innerText = err.message;
  pre.className = 'snipplet-error';
  document.body.appendChild(pre);
}
