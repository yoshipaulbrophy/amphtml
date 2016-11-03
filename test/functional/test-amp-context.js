import {
  AmpContext,
  MessageType_,
} from '../../3p/ampcontext';
import {createIframePromise} from '../../testing/iframe';
import * as sinon from 'sinon';

describe('3p ampcontext.js', () => {
  let windowPostMessageSpy;
  let windowMessageHandler;
  let win;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    windowPostMessageSpy = sinon.sandbox.spy();
    win = {
      addEventListener: (eventType, handlerFn) => {
        expect(eventType).to.equal('message');
        expect(windowMessageHandler).to.not.be.ok;
        windowMessageHandler = handlerFn;
      },
      parent: {
        postMessage: windowPostMessageSpy,
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
    win = undefined;
    windowMessageHandler = undefined;
  });

  it('should add metadata to window.context', () => {
    win.name = JSON.stringify(generateAttributes('1-291921'));
    const context = new AmpContext(win);
    expect(context).to.be.ok;
    expect(context.location).to.equal('foo.com');
    expect(context.canonicalUrl).to.equal('foo.com');
    expect(context.clientId).to.equal('123');
    expect(context.pageViewId).to.equal('1');
    expect(context.sentinel).to.equal('1-291921');
    expect(context.startTime).to.equal('0');
    expect(context.referrer).to.equal('baz.net');
  });

  it('should be able to send an intersection observer request', () => {
    win.name = JSON.stringify(generateAttributes('1-291921'));
    const context = new AmpContext(win);
    const callbackSpy = sinon.spy();
    const stopObserving = context.observeIntersection(callbackSpy);

    // window.context should have sent postMessage asking for intersection
    // observer
    expect(windowPostMessageSpy.calledOnce).to.be.true;
    expect(windowPostMessageSpy.calledWith({
      sentinel: '1-291921',
      type: MessageType_.SEND_INTERSECTIONS,
    }, '*'));

    // send an intersection message down
    const messagePayload = {
      sentinel: '1-291921',
      type: MessageType_.INTERSECTION,
    };
    const messageData = 'amp-' + JSON.stringify(messagePayload);
    const message = {
      source: context.ampWindow,
      data: messageData,
    };
    windowMessageHandler(message);

    // window.context should have received intersection observer postMessage
    // back, and should have called the callback function
    expect(callbackSpy.calledOnce).to.be.true;
    expect(callbackSpy.calledWith(messagePayload));

    // Stop listening for intersection observer messages
    stopObserving();

    // Send intersection observer message
    windowMessageHandler(message);

    // callback should not have been called a second time
    expect(callbackSpy.calledOnce).to.be.true;
  });

  it('should send a pM and set callback when observePageVisibility()', () => {
    /*
      Create window.context using ampcontext
      Mock postMessage on ampWindow
      Mock registerCallback
      Call observePageVisibility
      Check that postMessage was called with correct parameters
      Check that registerCallback was called with correct parameters
    */
    win.name = JSON.stringify(generateAttributes('1-291921'));
    const context = new AmpContext(win);
    const callbackSpy = sinon.spy();
    const stopObserving = context.observePageVisibility(callbackSpy);

    // window.context should have sent postMessage asking for visibility
    // observer
    expect(windowPostMessageSpy.calledOnce).to.be.true;
    expect(windowPostMessageSpy.calledWith({
      sentinel: '1-291921',
      type: MessageType_.SEND_EMBED_STATE,
    }, '*'));

    // send a page visibility message down
    const messagePayload = {
      sentinel: '1-291921',
      type: MessageType_.EMBED_STATE,
    };
    const messageData = 'amp-' + JSON.stringify(messagePayload);
    const message = {
      source: context.ampWindow,
      data: messageData,
    };
    windowMessageHandler(message);

    // window.context should have received visibility observer postMessage
    // back, and should have called the callback function
    expect(callbackSpy.calledOnce).to.be.true;
    expect(callbackSpy.calledWith(messagePayload));

    // Stop listening for page visibility observer messages
    stopObserving();

    // Send visibility observer message
    windowMessageHandler(message);

    // callback should not have been called a second time
    expect(callbackSpy.calledOnce).to.be.true;
  });

  it('should call resize success callback on resize success', () => {
    win.name = JSON.stringify(generateAttributes('1-291921'));
    const context = new AmpContext(win);
    const successCallbackSpy = sinon.spy();
    const deniedCallbackSpy = sinon.spy();

    context.onResizeSuccess(successCallbackSpy);
    context.onResizeDenied(deniedCallbackSpy);

    const height = 100;
    const width = 200;
    context.requestResize(height, width);

    // window.context should have sent postMessage requesting resize
    expect(windowPostMessageSpy.calledOnce).to.be.true;
    expect(windowPostMessageSpy.calledWith({
      sentinel: '1-291921',
      type: MessageType_.SEND_EMBED_STATE,
      width,
      height,
    }, '*'));

    // send a resize success message down
    const messagePayload = {
      sentinel: '1-291921',
      type: MessageType_.EMBED_SIZE_CHANGED,
    };
    const messageData = 'amp-' + JSON.stringify(messagePayload);
    const message = {
      source: context.ampWindow,
      data: messageData,
    };
    windowMessageHandler(message);

    // window.context should have received resize success message, and then
    // called the success callback
    expect(successCallbackSpy.calledOnce).to.be.true;
    expect(successCallbackSpy.calledWith(messagePayload));

    expect(deniedCallbackSpy.called).to.be.false;
  });

  it('should call resize denied callback on resize denied', () => {
    win.name = JSON.stringify(generateAttributes('1-291921'));
    const context = new AmpContext(win);
    const successCallbackSpy = sinon.spy();
    const deniedCallbackSpy = sinon.spy();

    context.onResizeSuccess(successCallbackSpy);
    context.onResizeDenied(deniedCallbackSpy);

    const height = 100;
    const width = 200;
    context.requestResize(height, width);

    // window.context should have sent resize request postMessage
    expect(windowPostMessageSpy.calledOnce).to.be.true;
    expect(windowPostMessageSpy.calledWith({
      sentinel: '1-291921',
      type: MessageType_.SEND_EMBED_STATE,
      width,
      height,
    }, '*'));

    // send a resize denied message down
    const messagePayload = {
      sentinel: '1-291921',
      type: MessageType_.EMBED_SIZE_DENIED,
    };
    const messageData = 'amp-' + JSON.stringify(messagePayload);
    const message = {
      source: context.ampWindow,
      data: messageData,
    };
    windowMessageHandler(message);

    // resize denied callback should have been called
    expect(deniedCallbackSpy.calledOnce).to.be.true;
    expect(deniedCallbackSpy.calledWith(messagePayload));

    expect(successCallbackSpy.called).to.be.false;
  });

  it('context should be available when creation event fired', () => {
    // create an iframe that includes the ampcontext-lib script
    return createIframePromise().then(iframe => {
      iframe.win.name = JSON.stringify(generateAttributes('1-291921'));

      const windowContextPromise = new Promise((resolve) => {
	iframe.win.addEventListener('windowContextCreated', resolve);
      });

      const windowContextScript = iframe.doc.createElement('script');
      windowContextScript.src = '../../dist.3p/current/ampcontext-lib.js';

      const scriptPromise = new Promise((resolve, reject) => {
	windowContextScript.addEventListener('error', () => {
          reject(new Error('script error'));
	});
	windowContextScript.addEventListener('load', resolve);
      });

      iframe.doc.body.appendChild(windowContextScript);
      return scriptPromise.then(() => windowContextPromise).then(() => {
	expect(iframe.win.context).to.be.ok;
	expect(iframe.win.context.location).to.equal('foo.com');
	expect(iframe.win.context.canonicalUrl).to.equal('foo.com');
	expect(iframe.win.context.clientId).to.equal('123');
	expect(iframe.win.context.pageViewId).to.equal('1');
	expect(iframe.win.context.sentinel).to.equal('1-291921');
	expect(iframe.win.context.startTime).to.equal('0');
	expect(iframe.win.context.referrer).to.equal('baz.net');
      });
    });
  });
});

function generateAttributes(sentinel) {
  const attributes = {};
  attributes._context = {
    location: 'foo.com',
    canonicalUrl: 'foo.com',
    clientId: '123',
    pageViewId: '1',
    sentinel,
    startTime: '0',
    referrer: 'baz.net',
  };

  return attributes;
}
