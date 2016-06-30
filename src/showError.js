export default function showError(err) {
  console.log(err);
  const span = document.createElement('span');
  span.innerText = err.message;
  span.className = "snipplet-error";
  document.body.appendChild(span);
}
