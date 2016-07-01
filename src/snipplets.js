import CodeMirror from 'codemirror';
global.CodeMirror = CodeMirror;

const { map } = Array.prototype;

function createIframe(deps) {
  const scripts = deps.map(dep => `<script src=${dep}>${'<'}/script>`).join('\n');
  const iframe = document.createElement('iframe');
  iframe.className = 'result';
  iframe.src = `data:text/html;charset=utf-8,
  <html>
    <head>
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
    <body>
      <div id="result"></div>
      <script>
        var container = document.getElementById('result');

        window.addEventListener('message', function(event) {
          var data = event.data;
          if (data.type === 'run') {
            try {
              var responder = eval(event.data.responder);
              if (!(responder instanceof Function)) {
               throw new Error('Snipplet responders must be a single function\n' +
                 event.data.responder);
              }
              var result = eval(data.code);
              if (result === 'use strict') {
                responder(undefined, container);
              } else {
                responder({ result: result }, container);
              }
              parent.postMessage({ success: true }, event.origin);
              parent.postMessage({ resize: container.clientHeight }, event.origin);
            } catch (e) {
              console.log(e);
              parent.postMessage({ error: e.toString() }, event.origin);
            }
          }
        });
      ${'<'}/script>
    </body>
  </html>`;
  return iframe;
}

function snipplet(area, compiler, responder) {
  const text = area.textContent.trim();
  const deps = (area.getAttribute('data-deps') || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

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

  const iframe = createIframe(deps.concat(responder.deps).concat(compiler.deps));
  div.appendChild(iframe);

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

    mirror.on('change', () =>
      compiler.compiler(mirror.getValue())
        .then(postCode)
        .catch(setError)
    );

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
