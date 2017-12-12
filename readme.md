# laxy [![Build Status](https://travis-ci.org/jamestalmage/laxy.svg?branch=master)](https://travis-ci.org/jamestalmage/laxy) [![codecov](https://codecov.io/gh/jamestalmage/laxy/badge.svg?branch=master)](https://codecov.io/gh/jamestalmage/laxy?branch=master)

> Proxies for lazy loading expensive objects.


## Install

```
$ npm install laxy
```


## Usage

```js
const laxy = require('laxy');

const proxy = laxy(generatorFn)(...argsToPass);

// generatorFn will only be called once, but not until you interact with the proxy in some way:
proxy();
proxy.foo;
Object.keys(proxy); // etc...

// Can be used as a lazy require
const _ = laxy(require)('lodash');

// lodash won't be loaded until you do something with it:
_.isNumber(3);
```


## Basic API

### laxy(generatorFn)(...argsToPass)

#### generatorFn

  Type: `fn`

  The function that should be called to generate the object being proxied. This function will be called lazily and only once.
  
#### ...argsToPass

  Type: `anything`

  Any number of arguments may be provided and will be passed to the function if/when it is called.

## Providing Type Hints

The Javscript Proxying API sets a few things in stone at the time of Proxy creation (like the response to `typeof`). Since we are lazy loading, and can't know these at creation time, `laxy` provides a hint system to help you customize the Proxy to better reflect the object you will return from your generator function. In many cases, you will not care, and the default type hint of `func` will be sufficient (even if your generator will return an object). Hints are provided with property chaining, the API remains the same:

```js
laxy.func(generatorFn)(...args);    // generator returns a function or class 
laxy.obj(generatorFn)(...args);     // generator returns an object
laxy.arrow(genneratorFn)(...args);  // generator returns an arrow function
laxy.class(generatorFn)(...args);   // generator IS a class function
``` 

Each of the type hint options are described in detail below:

  * `obj` - Indicates your generator function will return an object. If you actually do return a function, you won't be able to invoke it, but you will be able to access and invoke members of the function. Your proxy will respond to `typeof proxy` with `'object'` regardless of what the actual proxied type is.

  * `func` - The default. This is the only option that allows for invocation of `new` (meaning your generator function `returns` a constructor). It works for most situations (even if you aren't returning a function), with a few caveats:
   
    * It will respond to `typeof` with `function`, regardless of the actual underlying type. 
    * `function`s have a *non*-enumerable, and non-configurable `prototype` property. The Proxy API insists that non-configurable properties are reflected in the proxy, so `Object.getOwnPropertyNames(proxy)` will include `'prototype'`. Note that the property is `non-enumerable`, so it won't show up in `Object.keys(proxy)`, etc.
  
  * `arrow` - Represents an arrow function. It is invocable, but can't be invoked with `new`. Does not suffer from the forced `prototype` property like `func` does.
  
  * `class` - While all the other hints suggest what the *return type* of your generator function will be. The `class` hint declares that your generator function *is* a class function, and should be invoked with `new`. This should not be confused to mean your generator will return a class function (in that case, use `func`);

|   Hint    | `typeof proxy` | invocable |  with `new` |  Caveats                                                     |
|-----------|:--------------:|:---------:|:-----------:|--------------------------------------------------------------|
| `obj`     |  `'object'`    |    No     |     No      |                                                              |
| `func`    |  `'function'`  |    Yes    |     Yes     | `prototype` member is enforced and non-configurable          |
| `arrow`   |  `'function'`  |    Yes    |     No      |  Avoids `prototype` issue, but can't be invoked with `new`.  |
| `class` * |  `'object'`    |    No     |     No      |  Causes your *generator function* to be invoked with `new`.  |


## Revocable Proxies

The Proxy API allows for [revocable proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/revocable). Calling the `revoke` method will invalidate the proxy, and any future access of the proxy will cause a `TypeError`. You can chain the `revocable` modifier to create a revocable proxy.

```js
const {revoke, proxy} = laxy.revocable(generatorFunc)(...args);
// or chain it with a type hint
const {revoke, proxy} = laxy.obj.revocable(generatorFunc)(...args);
```

## The `frozen` Modifier

It's simply not possible for `laxy` to modify the `isExtensible` state of the underlying object. Calling `Object.preventExtensions` or `Object.freeze` on the proxy will not have the desired effect. Similarly, `Object.isExtensible(proxy)` will return `true`, even if your generator will return a non-extensible object. If you will return a frozen object from your generator, you can add the `frozen` modifier so that `Object.isExtensible` will correctly return `false`. 

```js
const generatorFunc = () => Object.freeze({foo: 'bar'});

const proxy = laxy(generatorFunc)();

Object.isExtensible(proxy); 
//=> true, even though the backing object is frozen

const frozenProxy = laxy.frozen(generatorFunc)();

Object.isExtensible(frozenProxy);
//=> false, as it should be
```

Note that the `frozen` modifier can be chained onto any of the type hints:

```js
laxy.obj.frozen(fn)(...args);
laxy.arrow.frozen(fn)(...args);
laxy.func.frozen(fn)(...args);
laxy.obj.revocable.frozen(fn)(...args);
```


## License

MIT © [James Talmage](https://github.com/jamestalmage)
