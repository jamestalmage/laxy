import test from 'ava';
import m from '.';

const stub = () => {
	function fn(foo, bar) {
		const obj = function (...args) {
			return {
				new: Boolean(new.target),
				args
			};
		};

		Object.assign(obj, {
			new: Boolean(new.target),
			call: ++fn.callCount,
			foo,
			bar,
			mFoo(caps) {
				return caps ? foo.toUpperCase() : foo;
			},
			mBar(caps) {
				return caps ? this.bar.toUpperCase() : this.bar;
			}
		});

		return obj;
	}
	fn.callCount = 0;
	return fn;
};

test('get', t => {
	const fn = stub();
	const proxied = m(fn)('baz', 'quz');

	t.is(fn.callCount, 0);
	t.is(proxied.foo, 'baz');
	t.is(fn.callCount, 1);
	t.is(proxied.bar, 'quz');
	t.is(fn.callCount, 1);

	const secondProxy = m(fn)('yo', 'da');
	t.is(fn.callCount, 1);
	t.is(secondProxy.foo, 'yo');
	t.is(fn.callCount, 2);
});

test('set', t => {
	const proxied = {};
	const proxy = m(() => proxied)();

	proxy.foo = 'bar';

	t.is(proxied.foo, 'bar');
});

test('apply', t => {
	const proxied = m(stub())('foo', 'bar');

	t.is(proxied.mFoo(), 'foo');
	t.is(proxied.mFoo(true), 'FOO');
	t.is(proxied.mBar(), 'bar');
	t.is(proxied.call, 1);
});

test('called with new', t => {
	const regularProxy = m(stub())('foo', 'bar');
	const newedProxy = new m(stub())('foo', 'bar'); // eslint-disable-line new-cap

	t.false(regularProxy.new);
	t.true(newedProxy.new);
});

test('proxied function invoked', t => {
	const proxy = m.func(stub())('foo', 'bar');
	const Proxy = m.func(stub())('foo', 'bar');

	t.is(proxy().new, false);
	t.is(new Proxy().new, true); // eslint-disable-line new-cap
	t.deepEqual(proxy('ziff', 'zoom').args, ['ziff', 'zoom']);
});

test('getPrototype', t => {
	const proto = {};

	const proxy = m(() => Object.create(proto))();

	t.is(Object.getPrototypeOf(proxy), proto);
});

test('setPrototype', t => {
	const protoA = {};
	const protoB = {};
	const target = Object.create(protoA);
	t.is(Object.getPrototypeOf(target), protoA);

	const proxy = m(() => target)();

	Object.setPrototypeOf(proxy, protoB);
	t.is(Object.getPrototypeOf(proxy), protoB);
	t.is(Object.getPrototypeOf(target), protoB);
});

test('isExtensible on an extensible object', t => {
	const yes = m(() => ({}))();

	t.true(Object.isExtensible(yes));
});

test.failing('isExtensible on a frozen object - fails', t => {
	const no = m(() => Object.freeze({}))();

	t.false(Object.isExtensible(no));
});

test('isExtensible on a frozen object - requires using the frozen adapter', t => {
	const no = m.frozen(() => Object.freeze({}))();

	t.false(Object.isExtensible(no));
});

test.failing('isExtensible using frozen adapter - but object is not frozen', t => {
	const obj = m.frozen(() => ({}))();

	t.true(Object.isExtensible(obj));
});

test('preventExtensions - works to freeze proxy', t => {
	const proxy = m(() => ({}))();
	Object.preventExtensions(proxy);
	t.false(Object.isExtensible(proxy));
});

test.failing('preventExtensions - works to freeze target', t => {
	const target = {};
	const proxy = m(() => target)();
	Object.preventExtensions(proxy);
	t.false(Object.isExtensible(target));
});

test('getOwnPropertyDescriptor', t => {
	let count = 0;
	const proxy = m(() => {
		count++;
		return ({foo: 'bar'});
	})();

	t.is(count, 0);

	t.deepEqual(
		Object.getOwnPropertyDescriptor(proxy, 'foo'),
		{
			configurable: true,
			enumerable: true,
			value: 'bar',
			writable: true
		}
	);

	t.is(count, 1);
});

test('defineProperty', t => {
	const proxied = {};
	const proxy = m(() => proxied)();

	Object.defineProperty(proxy, 'foo', {value: 'bar'});

	t.is(proxied.foo, 'bar');
});

test('has', t => {
	const proxy = m(() => ({foo: 'bar'}))();

	t.true('foo' in proxy);
	t.false('bar' in proxy);
});

test('deleteProperty', t => {
	const proxy = m(() => ({foo: 'bar'}))();

	t.true('foo' in proxy);
	delete proxy.foo;
	t.false('foo' in proxy);
});

test('ownKeys: Object.keys', t => {
	const proxied = {foo: 'foo', bar: 'bar'};
	const proxy = m(() => proxied)();

	t.deepEqual(Object.keys(proxy), ['foo', 'bar']);
});

test('ownKeys: Object.getOwnPropertyNames', t => {
	const proxied = {foo: 'foo', bar: 'bar'};
	const proxy = m.obj(() => proxied)();

	t.deepEqual(Object.getOwnPropertyNames(proxy), ['foo', 'bar']);
});

test('revocable', t => {
	const {revoke, proxy} = m.revocable(() => ({}))();

	proxy.foo = 'foo';
	t.is(proxy.foo, 'foo');

	revoke();

	t.throws(() => proxy.foo);
});

test('class modifier', t => {
	const proxy = m.class(class {
		foo() {
			return 'bar';
		}
	})();

	t.is(typeof proxy, 'object');
	t.is(proxy.foo(), 'bar');
});

test('obj modifier', t => {
	const proxy = m.obj(() => ({foo: 'bar'}))();

	t.is(typeof proxy, 'object');
	t.is(proxy.foo, 'bar');
});

test('arrow modifier', t => {
	const proxy = m.arrow(() => () => 'bar')();

	t.is(typeof proxy, 'function');

	t.false(Object.getOwnPropertyNames(proxy).includes('prototype'));
});
