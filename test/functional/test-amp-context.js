import {user} from '../../src/log';
import {extensionsFor} from '../../src/extensions';
import {createIframePromise} from '../../testing/iframe';
import {
  loadPromise,
  listenOncePromise,
} from '../../src/event-helper';
import {generateSentinel} from '../../src/3p-frame.js';

describe('3p ampcontext.js', () => {

  it('should add metadata to window.context', () => {
    return createIframePromise().then(fixture => {
      let frame1 = fixture.doc.createElement("iframe");
      frame1.src = "http://localhost:9876/test/fixtures/served/ampcontext-loader.html";
      frame1.src += "#sendMetadata";
      // set name attribute to context stuff as expected
      // iframe should take this and pass it down to child also on name attribute
      const sentinel = generateSentinel(fixture.win);
      frame1.name = JSON.stringify(generateAttributes(sentinel));
      fixture.doc.body.appendChild(frame1);
      return listenOncePromise(window.top, "message").then(message => {
        user().info("test", "message=%s", message);
        let context = JSON.parse(message.data);
        expect(context).to.be.ok;
        expect(context.location).to.equal("foo.com");
        expect(context.canonicalUrl).to.equal("foo.com");
        expect(context.clientId).to.equal("123");
        expect(context.pageViewId).to.equal("1");
        expect(context.sentinel).to.equal(sentinel);
        expect(context.startTime).to.equal("0");
        expect(context.referrer).to.equal("baz.net");
      });
    });
  });

  /*it('should be able to send an intersection observer request', () => {
    return createIframePromise().then(fixture => {
      let frame1 = fixture.doc.createElement("iframe");
      frame1.src = "http://localhost:9876/test/fixtures/served/ampcontext-loader.html";
      frame1.src += "#sendIntersectionObserver";
      // set name attribute to context stuff as expected
      // iframe should take this and pass it down to child also on name attribute
      const sentinel = generateSentinel(fixture.win);
      frame1.name = JSON.stringify(generateAttributes(sentinel));
      fixture.doc.body.appendChild(frame1);
      return listenOncePromise(window.top, "message").then(message => {
        user().info("test", "message=%s", message);
        let context = JSON.parse(message.data);
        expect(context).to.be.ok;
        expect(context.location).to.equal("foo.com");
        expect(context.canonicalUrl).to.equal("foo.com");
        expect(context.clientId).to.equal("123");
        expect(context.pageViewId).to.equal("1");
        expect(context.sentinel).to.equal(sentinel);
        expect(context.startTime).to.equal("0");
        expect(context.referrer).to.equal("baz.net");

  });*/

});


function generateAttributes(sentinel){
  attributes = {};
  attributes._context = {
    location : "foo.com",
    canonicalUrl : "foo.com",
    clientId : "123",
    pageViewId : "1",
    sentinel : sentinel,
    startTime : "0",
    referrer : "baz.net",
  };

  return attributes;
}
