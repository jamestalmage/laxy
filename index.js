'use strict';
const lazySingleton = require('lazy-singleton');

const backingTypes = {
	arrow: () => () => {},
	func: () => function () {},
	obj: () => ({}),
	class: () => ({})
};

const unconfigurableProps = {};

Object.keys(backingTypes).forEach(prop => {
	const value = backingTypes[prop]();
	unconfigurableProps[prop] = Object.getOwnPropertyNames(value).filter(prop =>
		!Object.getOwnPropertyDescriptor(value, prop).configurable
	);
});

// Unhandled proxy methods: isExtensible, preventExtensions

const handlerMethods = [
	'getPrototypeOf',
	'setPrototypeOf',
	'getOwnPropertyDescriptor',
	'defineProperty',
	'has',
	'get',
	'set',
	'deleteProperty',
	'ownKeys',
	'apply',
	'construct'
];

const syncHandler = {};

handlerMethods.forEach(method => {
	syncHandler[method] = function (target, ...args) {
		return Reflect[method](target.get(), ...args);
	};
});

Object.assign(syncHandler, {
	ownKeys(target) {
		const instance = target.get();
		const result = Reflect.ownKeys(instance);
		for (const key of target.unconfigurableProps) {
			if (!result.includes(key)) {
				result.push(key);
			}
		}

		return result;
	},
	getOwnPropertyDescriptor(target, prop) {
		const instance = target.get();
		const actualDesc = Reflect.getOwnPropertyDescriptor(instance, prop);

		if (!target.unconfigurableProps.includes(prop)) {
			return actualDesc;
		}

		return Reflect.getOwnPropertyDescriptor(target, prop);
	}
});

const create = (type, frozen, revocable) => {
	function api(fn) {
		const callWithNew = Boolean(new.target || type === 'class');
		const wrappedFn = callWithNew ? new lazySingleton.Sync(fn) : lazySingleton(fn);

		return (...args) => {
			const target = backingTypes[type]();
			target.get = wrappedFn(...args);
			target.unconfigurableProps = unconfigurableProps[type];

			if (frozen) {
				Object.freeze(target);
			}

			return revocable ? Proxy.revocable(target, syncHandler) : new Proxy(target, syncHandler);
		};
	}

	if (!frozen) {
		api.frozen = create(type, true, revocable);
	}

	if (!revocable) {
		api.revocable = create(type, frozen, true);
	}

	return api;
};

module.exports = create('func');

Object.keys(backingTypes).forEach(key => {
	module.exports[key] = create(key);
});
