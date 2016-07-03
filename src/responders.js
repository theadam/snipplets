import { getDeps } from './utils';

function defaultResponder(getData, container, code) {
  const pre = document.createElement('pre');
  pre.innerText = !code ? '' : JSON.stringify(getData());
  // eslint-disable-next-line no-param-reassign
  container.innerHTML = '';
  container.appendChild(pre);
}

function responder(text, id, compiler) {
  return compiler.compiler(text)
  .catch(e => {
    throw Object.create(e, { message: {
      value: `Could not compile snipplet responder with id '${id}': ${e.message}`,
    } });
  });
}

const { map } = Array.prototype;
export default function responders(compilers) {
  return Promise.resolve().then(() =>
    Promise.all(document.querySelectorAll('textarea.snipplet-responder')::map(responderEl => {
      const id = responderEl.id;
      if (!id) throw new Error("Snipplet responders must have an 'id' attribute set");
      const deps = getDeps(responderEl);

      return responder(responderEl.innerText, id, compilers.default).then(source => ({
        id,
        data: {
          source,
          deps,
        },
      }));
    })))
    .then(resps => resps.reduce((acc, { id, data }) => ({ ...acc, [id]: data }), {}))
    .then(resps => {
      if (resps.default !== undefined) return resps;
      return { ...resps, default: { source: `(${defaultResponder.toString()})`, deps: [] } };
    });
}
