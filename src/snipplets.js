import CodeMirror from 'codemirror';
global.CodeMirror = CodeMirror;

import { getDeps, debounce } from './utils';

const { map } = Array.prototype;

function iframebody() {
  return `
    <div id="result"></div>
    <script>
      var container = document.getElementById('result');
      var responder;

      window.addEventListener('message', function(event) {
        var data = event.data;
        if (!container.onresize) {
          container.onresize = function() {
            parent.postMessage({ resize: container.clientHeight }, event.origin);
          }
        }
        if (data.type === 'run') {
          Promise.resolve().then(function() {
            if (!(responder instanceof Function)) {
              var responder = eval(event.data.responder);
              if (!(responder instanceof Function)) {
                throw new Error('Snipplet responders must be a single function\\n' +
                  event.data.responder);
              }
            }
            function getResult() {
              return eval(data.code);
            }
            return Promise.resolve(responder(getResult, container, data.code)).then(function() {
              parent.postMessage({ success: true }, event.origin);
              parent.postMessage({ resize: container.clientHeight }, event.origin);
            });
          }).catch(function(e) {
            console.log(e);
            parent.postMessage({ error: e.toString() }, event.origin);
          });
        }
      });
    ${'<'}/script>
  `;
}

function iframecontent(deps) {
  const scripts = deps.map(dep => `<script src=${dep}>${'<'}/script>`).join('\n');
  return `
  <html>
    <head>
      <base href="${window.location.href}">
      <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/es6-promise/3.2.2/es6-promise.min.js"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/4.2.0/normalize.min.css">
      ${scripts}
      <style>
        body {
          margin: 0px;
          width: 100%;
        }

        #result {
          width: 100%;
          font-size: 1.2em;
        }

        #result pre {
          margin: 0px;
          border: none;
          padding: 10px;
        }
      </style>
    </head>
    <body>${iframebody()}</body>
  </html>`;
}

function createIframe() {
  const iframe = document.createElement('iframe');
  iframe.className = 'result';
  return iframe;
}

function snipplet(area, compiler, responder) {
  const text = area.textContent.trim();
  const deps = getDeps(area);

  const container = document.createElement('div');
  container.className = 'container';
  area.parentNode.insertBefore(container, area.nextSibling);

  const div = document.createElement('div');
  div.className = 'snipplet-container';
  container.appendChild(div);

  const mirror = CodeMirror(div, {
    value: text,
    mode: area.getAttribute('data-mode') || 'jsx',
    theme: area.getAttribute('data-theme') || 'default',
    tabSize: 2,
    lineNumbers: true,
    viewportMargin: Infinity,
  });

  const content = iframecontent(deps.concat(responder.deps).concat(compiler.deps));
  const iframe = createIframe();
  div.appendChild(iframe);
  iframe.contentWindow.content = content;
  // eslint-disable-next-line no-script-url
  iframe.src = 'javascript:window["content"]';

  const error = document.createElement('pre');
  error.className = 'snipplet-editor-error';
  div.appendChild(error);
  const setError = e => {
    if (e === undefined) {
      iframe.style.display = '';
      error.style.display = 'none';
    } else {
      iframe.style.display = 'none';
      error.style.display = '';
      error.innerText = e.message || e.toString();
    }
  };

  compiler.compiler(text).then(compiled => {
    setError(undefined);
    const postCode = code => {
      iframe.contentWindow.postMessage({
        type: 'run',
        code,
        responder: responder.source,
      }, '*');
    };

    iframe.onload = () => postCode(compiled);

    mirror.on('change', debounce(300, () =>
      compiler.compiler(mirror.getValue())
        .then(postCode)
        .catch(setError)
    ));

    window.addEventListener('message', event => {
      if (event.source.frames !== iframe.contentWindow) return;
      if (event.data.error) {
        setError(event.data.error);
        return;
      }
      if (event.data.success) {
        setError(undefined);
      }
      if (event.data.resize) {
        iframe.style.height = Math.min(event.data.resize + 2, 400);
      }
    });
  }).catch(setError);
}

export default function snipplets(compilers, responders) {
  return Promise.resolve().then(() =>
    document.querySelectorAll('textarea.snipplet')::map(snippletArea => {
      const compilerId = snippletArea.getAttribute('data-compiler-id') || 'default';
      const compiler = compilers[compilerId];
      if (!compiler) {
        throw new Error(
          `There is no snipplet compiler defined for compiler id '${compilerId}'`
        );
      }

      const responderId = snippletArea.getAttribute('data-responder-id') || 'default';
      const responder = responders[responderId];
      if (!responder) {
        throw new Error(
          `There is no snipplet responder defined for responder id '${responderId}'`
        );
      }

      return snipplet(snippletArea, compiler, responder);
    })
  );
}
