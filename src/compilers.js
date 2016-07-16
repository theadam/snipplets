import * as Babel from 'babel-standalone';
global.Babel = Babel;

import { getDeps } from './utils';

function defaultCompiler(code) {
  return Babel.transform(code, { presets: ['es2015', 'stage-0', 'react'] }).code;
}

function toCompiler() {
  const comp = this;
  return function compiler(code) {
    return Promise.resolve().then(() =>
      (code.trim().length === 0 ? undefined : comp(code))
    );
  };
}

function compEval(code, comp = defaultCompiler::toCompiler()) {
  return comp(code).then(compiled => (0, eval)(`${compiled}`));
}

function getCompiler(script, id) {
  if (script.trim().length === 0) throw new Error(`Compiler cannot be empty (compiler id '${id}')`);
  return compEval(`${script}`).catch(e => {
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
    return compilerFn::toCompiler();
  });
}

const { map } = Array.prototype;

export default function compilers() {
  return Promise.resolve().then(() =>
    Promise.all(document.querySelectorAll('textarea.snipplet-compiler')::map(script => {
      const deps = getDeps(script);

      const id = script.id;
      if (!id) throw new Error("Snipplet compilers must have an 'id' attribute set");
      return getCompiler(script.innerText, id).then(compiler => ({
        id,
        data: {
          compiler,
          deps,
        },
      }));
    }))
  )
  .then(cList => cList.reduce((acc, { id, data }) => ({ ...acc, [id]: data }), {}))
  .then(comps => {
    if (comps.default !== undefined) return comps;
    return { ...comps, default: { compiler: defaultCompiler::toCompiler(), deps: [] } };
  });
}

