import CodeMirror from 'codemirror';

const { map } = Array.prototype;

function defaultOnResult(data, container) {
  const pre = document.createElement('pre');
  pre.innerText = data === undefined ? '' : JSON.stringify(data.result, 2, 2);
  // eslint-disable-next-line no-param-reassign
  container.innerHTML = '';
  container.appendChild(pre);
}

function createIframe() {
  const iframe = document.createElement('iframe');
  iframe.className = 'result';
  iframe.src = `data:text/html;charset=utf-8,
  <html>
    <head>
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
              var responder = eval('(' + event.data.responder + ');');
              console.log(event.data.responder);
              if (!(responder instanceof Function)) {
               throw new Error('Snipplet responders must be a single function\n' +
                 event.data.responder);
              }
              var result = eval(data.code);
              if (result === 'use strict') return responder(undefined, container);
              responder({ result: result }, container);
              parent.postMessage({ success: container.clientHeight }, event.origin);
            } catch (e) {
              console.log(e);
              parent.postMessage({ error: e }, event.origin);
            }
          }
        });
      ${'<'}/script>
    </body>
  </html>`;
  return iframe;
}

function snipplet(area, compiler) {
  const text = area.textContent.trim();

  const div = document.createElement('div');
  div.className = 'container';
  area.parentNode.insertBefore(div, area.nextSibling);
  const mirror = CodeMirror(div, {
    value: text,
    mode: area.getAttribute('data-lang') || 'javascript',
    theme: area.getAttribute('data-theme') || 'default',
    lineNumbers: true,
    viewportMargin: Infinity,
  });

  const iframe = createIframe();
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

  compiler(text).then(compiled => {
    setError(undefined);
    const postCode = code => {
      iframe.contentWindow.postMessage({
        type: 'run',
        code,
        responder: defaultOnResult.toString(),
      }, '*');
    };

    iframe.onload = () => postCode(compiled);

    mirror.on('change', () =>
      compiler(mirror.getValue())
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
        iframe.style.height = event.data.success;
      }
    });
  }).catch(setError);
}

export default function snipplets(compilers) {
  return Promise.resolve().then(() =>
    document.querySelectorAll('textarea.snipplet')::map(snippletArea => {
      const compilerId = snippletArea.getAttribute('data-compiler-id') || 'default';
      const compiler = compilers[compilerId];
      if (!compiler) {
        throw new Error(
          `There is no snipplet compiler defined for compiler id '${compilerId}'
        `);
      }
      return snipplet(snippletArea, compiler);
    })
  );
}
