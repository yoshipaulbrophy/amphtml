import {
  IframeMessagingClient,
} from '../../3p/iframe-messaging-client';
import {timerFor} from '../../src/timer';
import {createIframePromise} from '../../testing/iframe';
import * as sinon from 'sinon';

describe('3p iframe-messaging-client.js', () => {
  let windowPostMessageSpy;
  let windowMessageHandler;
  let win;
  let sandbox;

  const timer = timerFor(window);

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
    win = undefined;
    windowMessageHandler = undefined;
  });

  it('should create listener and call registered callbacks', () => {
    return createIframePromise().then(iframe => {
      let win_ = iframe.win;
      msgClient = new IframeMessagingClient(win_);

      const callbackSpy = sandbox.spy();
      msgClient.registerCallback_('MSG_TYPE', callbackSpy);

      const wrongCallbackSpy = sandbox.spy();
      msgClient.registerCallback_('WRONG_MESSAGE', wrongCallbackSpy);

      const msgData = {
        type: 'MSG_TYPE',
        sentinel: msgClient.getSentinel(),
      };
      const jsonMsgData = 'amp-' + JSON.stringify(msgData);
      win_.postMessage(jsonMsgData, '*');

      // wait for postMessage to get received by listener
      return timer.promise(20).then(() => {
        // make sure that correct callback was called with correct data
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.calledWith(msgData)).to.be.true;

        // make sure the wrong callback was never called
        expect(wrongCallbackSpy.called).to.be.false;
      });
    });
  });

  it('should stop listening for message types that are unregistered', () => {
    return createIframePromise().then(iframe => {
      let win_ = iframe.win;
      msgClient = new IframeMessagingClient(win_);

      const callbackSpy = sandbox.spy();
      const unregister = msgClient.registerCallback_(
          'MSG_TYPE', callbackSpy);

      const msgData = {
        type: 'MSG_TYPE',
        sentinel: msgClient.getSentinel(),
      };

      const jsonMsgData = 'amp-' + JSON.stringify(msgData);
      win_.postMessage(jsonMsgData, '*');

      // wait for postMessage to get received by listener
      return timer.promise(20).then(() => {
        // make sure that correct callback was called with correct data
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.calledWith(msgData)).to.be.true;

        // call the unregister function to remove the callback we previously
        // registered for message of type "MSG_TYPE"
        unregister();

        win_.postMessage(jsonMsgData, '*');
        return timer.promise(20).then(() => {
          // callback should not have been called again, still should only
          // have been called once
          expect(callbackSpy.calledOnce).to.be.true;
        });
      });
    });
  });

  it('should create sentinel once', () => {
    return createIframePromise().then(iframe => {
      let win_ = iframe.win;
      msgClient = new IframeMessagingClient(win_);
      // sentinel shouldn't have been assigned yet
      expect(msgClient.sentinel).to.not.be.ok;

      // call getSentinel
      const sentinel = msgClient.getSentinel();
      expect(sentinel).to.be.ok;
      // sentinel should now exist
      expect(msgClient.sentinel).to.be.ok;
      expect(msgClient.sentinel).to.equal(sentinel);
      expect(msgClient.getSentinel()).to.equal(sentinel);
    });
  });

  it('should get hostWindow', () => {
    return createIframePromise().then(iframe => {
      let win_ = iframe.win;
      msgClient = new IframeMessagingClient(win_);
      // hostWindow shouldn't have been assigned yet
      expect(msgClient.hostWindow).to.not.be.ok;

      // call getHostWindow
      const hostWindow = msgClient.getHostWindow();
      expect(hostWindow).to.be.ok;
      // msgClient.hostWindow should now exist
      expect(msgClient.hostWindow).to.be.ok;
      expect(msgClient.hostWindow).to.equal(hostWindow);
      expect(msgClient.getHostWindow()).to.equal(hostWindow);
    });
  });

  it('should fail if no window provided', () => {
    const IframeMessagingClientSpy = sinon.spy(IframeMessagingClient);
    try{
      new IframeMessagingClientSpy();
    } catch(err){
      // do nothing with it
    }
    expect(IframeMessagingClientSpy.threw()).to.be.true;
    expect(IframeMessagingClientSpy.exceptions.length).to.equal(1);

   });

});
