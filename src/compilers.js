import * as Babel from 'babel-standalone';
global.Babel = Babel;

function defaultCompiler(code) {
  return Babel.transform(code, { presets: ['es2015', 'stage-0', 'react'] }).code;
}

function wrapCompiler(comp, id) {
  if (comp.length === 1) {
    return (code) => Promise.resolve().then(() => comp(code));
  } else if (comp.length === 2) {
    return code =>
      new Promise((res, rej) => {
        comp(code, (err, data) => {
          if (err) return rej(err);
          return res(data);
        });
      });
  }
  throw new Error(
    `Snipplet compiler functions must accept either one or two arguments (compiler id '${id}')`
  );
}

function removeStrict(code) {
  return code.replace('"use strict";', '');
}

export function compEval(code, comp = wrapCompiler(defaultCompiler)) {
  return comp(code).then(compiled => (0, eval)(`${removeStrict(compiled)}`));
}

function getCompiler(script, id) {
  if (script.trim().length === 0) throw new Error(`Compiler cannot be empty (compiler id '${id}')`);
  return compEval(`(${script})`).catch(e => {
    throw Object.create(e, { message: {
      value: `Could not compile snipplet compiler with id '${id}': ${e.message}`,
    } });
  }).then(compilerFn => {
    if (!(compilerFn instanceof Function)) {
      throw new Error(
        `Snipplet compilers must evaluate to a function (compiler id '${id}').  ` +
        'Make sure your compiler is just one function.'
      );
    }
    return { id, fn: wrapCompiler(compilerFn, id) };
  });
}

const { map } = Array.prototype;

export default function compilers() {
  return Promise.resolve().then(() =>
    Promise.all(document.querySelectorAll('textarea.snipplet-compiler')::map(script => {
      const id = script.id;
      if (!id) throw new Error("Snipplet compilers must have an 'id' attribute set");
      return getCompiler(script.innerText, id);
    }))
  )
  .then(cList => cList.reduce((acc, { id, fn }) => ({ ...acc, [id]: fn }), {}))
  .then(comps => {
    if (comps.default !== undefined) return comps;
    return { ...comps, default: wrapCompiler(defaultCompiler) };
  });
}

