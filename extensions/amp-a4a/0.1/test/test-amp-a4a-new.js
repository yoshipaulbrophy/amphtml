/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {AmpA4A} from '../amp-a4a';
import {Xhr} from '../../../../src/service/xhr-impl';
import {Viewer} from '../../../../src/service/viewer-impl';
import {ampdocServiceFor} from '../../../../src/ampdoc';
import {base64UrlDecodeToBytes} from '../../../../src/utils/base64';
import {cancellation} from '../../../../src/error';
import {createIframePromise} from '../../../../testing/iframe';
import {data as minimumAmp} from './testdata/minimum_valid_amp.reserialized';
import {data as regexpsAmpData} from './testdata/regexps.reserialized';
import {
  data as validCSSAmp,
} from './testdata/valid_css_at_rules_amp.reserialized';
import {data as testFragments} from './testdata/test_fragments';
import {data as expectations} from './testdata/expectations';
import {installDocService} from '../../../../src/service/ampdoc-impl';
import '../../../../extensions/amp-ad/0.1/amp-ad-api-handler';
import * as sinon from 'sinon';

class MockA4AImpl extends AmpA4A {
  getAdUrl() {
    return Promise.resolve('https://test.location.org/ad/012345?args');
  }

  extractCreativeAndSignature(responseArrayBuffer, responseHeaders) {
    return Promise.resolve({
      creative: responseArrayBuffer,
      signature: base64UrlDecodeToBytes(responseHeaders.get('X-Google-header')),
    });
  }
}

/**
 * Create a promise for an iframe that has a super-minimal mock AMP environment
 * in it.
 *
 * @return {!Promise<{
 *   win: !Window,
 *   doc: !Document,
 *   iframe: !Element,
 *   addElement: function(!Element):!Promise
 * }>
 */
function createAdTestingIframePromise() {
  return createIframePromise().then(fixture => {
    installDocService(fixture.win, /* isSingleDoc */ true);
    const doc = fixture.doc;
    // TODO(a4a-cam@): This is necessary in the short term, until A4A is
    // smarter about host document styling.  The issue is that it needs to
    // inherit the AMP runtime style element in order for shadow DOM-enclosed
    // elements to behave properly.  So we have to set up a minimal one here.
    const ampStyle = doc.createElement('style');
    ampStyle.setAttribute('amp-runtime', 'scratch-fortesting');
    doc.head.appendChild(ampStyle);
    return fixture;
  });
}

describe('amp-a4a', () => {
  let sandbox;
  /*let xhrMock;
  let xhrMockJson;
  let viewerWhenVisibleMock;
  let mockResponse;*/

  const defaultAttributes = {
    'width': 200,
    'height': 50,
    'type': 'adsense',
  };

  function createA4aElement(doc) {
    const element = doc.createElement('amp-a4a');
    element.getAmpDoc = () => {
      const ampdocService = ampdocServiceFor(doc.defaultView);
      return ampdocService.getAmpDoc(element);
    };
    doc.body.appendChild(element);
    return element;
  }

  function getA4A(fixture, attr) {
    const doc = fixture.doc;
    const a4aElement = createA4aElement(doc);
    for (const i in attr) {
      a4aElement.setAttribute(i, attr[i]);
    }
    return new MockA4AImpl(a4aElement);
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    /*xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
    xhrMockJson.withArgs(
        'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
        {mode: 'cors', method: 'GET'})
    .returns(Promise.resolve({keys: [JSON.parse(validCSSAmp.publicKey)]}));*/
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#getSigningServiceNames', () => {
    it('should retrieve no valid keys', () => {
      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve({keys: [JSON.parse(validCSSAmp.publicKey)]}));

      const getSigningServiceNamesMock = sandbox.stub(AmpA4A.prototype,
          'getSigningServiceNames');
      getSigningServiceNamesMock.throws("Not implemented");

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(2);

        // Check that the keys are valid.
        const keyValidationPromises = a4a.keyInfoSetPromises_.map(
            keyInfoSetPromise => {
              expect(keyInfoSetPromise).to.be.instanceof(Promise);
              return keyInfoSetPromise.then(keyInfoSet => {
                expect(keyInfoSet).to.not.be.null;
                expect(Array.isArray(keyInfoSet)).to.be.true;
                expect(keyInfoSet.length).to.equal(1);
                return keyInfoSet[0];
              })
              .then(keyInfo => {
                expect(keyInfo).to.not.be.null;
                expect(keyInfo.hash).to.not.be.null;
                expect(keyInfo.cryptoKey).to.not.be.null;
                expect(keyInfo.cryptoKey).to.be.instanceof(CryptoKey);
              });
            });
        return Promise.all(keyValidationPromises);
      });

    });
  });

  describe('#getKeyInfoSets_', () => {
    it('should retrieve two valid keys (including dev key)', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve({keys: [JSON.parse(validCSSAmp.publicKey)]}));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(2);

        // Check that the keys are valid.
        const keyValidationPromises = a4a.keyInfoSetPromises_.map(
            keyInfoSetPromise => {
              expect(keyInfoSetPromise).to.be.instanceof(Promise);
              return keyInfoSetPromise.then(keyInfoSet => {
                expect(keyInfoSet).to.not.be.null;
                expect(Array.isArray(keyInfoSet)).to.be.true;
                expect(keyInfoSet.length).to.equal(1);
                return keyInfoSet[0];
              })
              .then(keyInfo => {
                expect(keyInfo).to.not.be.null;
                expect(keyInfo.hash).to.not.be.null;
                expect(keyInfo.cryptoKey).to.not.be.null;
                expect(keyInfo.cryptoKey).to.be.instanceof(CryptoKey);
              });
            });
        return Promise.all(keyValidationPromises);
      });
    });

    it('should retrieve no keys due to network error', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.reject("Network Error."));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');
      const useLocalDevKeyStub = sandbox.stub(AmpA4A.prototype, 'useLocalDevKey_');
      useLocalDevKeyStub.returns(false);

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;
        expect(useLocalDevKeyStub.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(1);

        // Ensure that each element is a Promise.
        expect(a4a.keyInfoSetPromises_[0]).to.be.instanceof(Promise);

        // Check that the key is empty.
        return a4a.keyInfoSetPromises_[0].then(keyInfoSet => {
          expect(keyInfoSet).to.not.be.null;
          expect(Array.isArray(keyInfoSet)).to.be.true;
          expect(keyInfoSet.length).to.equal(0);
        });
      });
    });

    it('should retrieve no keys due to response not being JSON', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve(validCSSAmp.publicKey));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');
      const useLocalDevKeyStub = sandbox.stub(AmpA4A.prototype, 'useLocalDevKey_');
      useLocalDevKeyStub.returns(false);

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;
        expect(useLocalDevKeyStub.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(1);

        // Ensure that each element is a Promise.
        expect(a4a.keyInfoSetPromises_[0]).to.be.instanceof(Promise);

        // Check that the key is empty.
        return a4a.keyInfoSetPromises_[0].then(keyInfoSet => {
          expect(keyInfoSet).to.not.be.null;
          expect(Array.isArray(keyInfoSet)).to.be.true;
          expect(keyInfoSet.length).to.equal(0);
        });
      });
    });

    it('should retrieve no keys due to response not being formatted correctly', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve({keeez: [JSON.parse(validCSSAmp.publicKey)]}));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');
      const useLocalDevKeyStub = sandbox.stub(AmpA4A.prototype, 'useLocalDevKey_');
      useLocalDevKeyStub.returns(false);

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;
        expect(useLocalDevKeyStub.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(1);

        // Ensure that each element is a Promise.
        expect(a4a.keyInfoSetPromises_[0]).to.be.instanceof(Promise);

        // Check that the key is empty.
        return a4a.keyInfoSetPromises_[0].then(keyInfoSet => {
          expect(keyInfoSet).to.not.be.null;
          expect(Array.isArray(keyInfoSet)).to.be.true;
          expect(keyInfoSet.length).to.equal(0);
        });
      });
    });

        it('should retrieve no keys due to response not being formatted correctly', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve({keeez: []}));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');
      const useLocalDevKeyStub = sandbox.stub(AmpA4A.prototype, 'useLocalDevKey_');
      useLocalDevKeyStub.returns(false);

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;
        expect(useLocalDevKeyStub.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(1);

        // Ensure that each element is a Promise.
        expect(a4a.keyInfoSetPromises_[0]).to.be.instanceof(Promise);

        // Check that the key is empty.
        return a4a.keyInfoSetPromises_[0].then(keyInfoSet => {
          expect(keyInfoSet).to.not.be.null;
          expect(Array.isArray(keyInfoSet)).to.be.true;
          expect(keyInfoSet.length).to.equal(0);
        });
      });
    });

    it('should retrieve no keys due to response not being formatted correctly', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve({keeez: []}));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');
      const useLocalDevKeyStub = sandbox.stub(AmpA4A.prototype, 'useLocalDevKey_');
      useLocalDevKeyStub.returns(false);

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;
        expect(useLocalDevKeyStub.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(1);

        // Ensure that each element is a Promise.
        expect(a4a.keyInfoSetPromises_[0]).to.be.instanceof(Promise);

        // Check that the key is empty.
        return a4a.keyInfoSetPromises_[0].then(keyInfoSet => {
          expect(keyInfoSet).to.not.be.null;
          expect(Array.isArray(keyInfoSet)).to.be.true;
          expect(keyInfoSet.length).to.equal(0);
        });
      });
    });

    it('should retrieve one invalid key', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');

      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve({keys: [{notAKey: 'invalid-key'}]}));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');
      const useLocalDevKeyStub = sandbox.stub(AmpA4A.prototype, 'useLocalDevKey_');
      useLocalDevKeyStub.returns(false);

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(1);

        // Check that one key is valid and the other invalid.
        const keyInfoSetPromise = a4a.keyInfoSetPromises_[0];
        expect(keyInfoSetPromise).to.be.instanceof(Promise);
        return keyInfoSetPromise.then(keyInfoSet => {
          expect(keyInfoSet).to.not.be.null;
          expect(Array.isArray(keyInfoSet)).to.be.true;
          expect(keyInfoSet.length).to.equal(1);
          const keyInfoPromise = keyInfoSet[0];
          expect(keyInfoPromise).to.not.be.null;
          expect(keyInfoPromise).to.be.instanceof(Promise);
          return keyInfoPromise.then(keyInfo => {
            expect(keyInfo).to.be.null;
          });
        });
      });
    });

    it('should retrieve one valid and one invalid key', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');
      const validKey = JSON.parse(validCSSAmp.publicKey);
      const invalidKey = {notAKey: 'invalid-key'};

      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve({keys: [validKey, invalidKey]}));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');
      const useLocalDevKeyStub = sandbox.stub(AmpA4A.prototype, 'useLocalDevKey_');
      useLocalDevKeyStub.returns(false);

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(1);

        let validKeyCheck = false;
        let invalidKeyCheck = false;

        // Check that one key is valid and the other invalid.
        const keyInfoSetPromise = a4a.keyInfoSetPromises_[0];
        expect(keyInfoSetPromise).to.be.instanceof(Promise);
        return keyInfoSetPromise.then(keyInfoSet => {
          expect(keyInfoSet).to.not.be.null;
          expect(Array.isArray(keyInfoSet)).to.be.true;
          expect(keyInfoSet.length).to.equal(2);
          const promises = keyInfoSet.map(keyInfoPromise => {
            expect(keyInfoPromise).to.not.be.null;
            expect(keyInfoPromise).to.be.instanceof(Promise);
            return keyInfoPromise.then(keyInfo => {
              if (keyInfo) {
                expect(keyInfo.hash).to.not.be.null;
                expect(keyInfo.cryptoKey).to.not.be.null;
                expect(keyInfo.cryptoKey).to.be.instanceof(CryptoKey);
                validKeyCheck = true;
              } else {
                expect(keyInfo).to.be.null;
                invalidKeyCheck = true;
              }
            })
          });
          return Promise.all(promises);
        }).then(() => {
          expect(validKeyCheck && invalidKeyCheck).to.be.true;
        });
      });
    });

    it('should retrieve one invalid key', () => {

      const xhrMockJson = sandbox.stub(Xhr.prototype, 'fetchJson');

      xhrMockJson.withArgs(
          'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
          {mode: 'cors', method: 'GET'})
      .returns(Promise.resolve({keys: [{notAKey: 'invalid-key'}]}));

      const getKeyInfoSetsSpy = sandbox.spy(AmpA4A.prototype, 'getKeyInfoSets_');

      return createAdTestingIframePromise().then(fixture => {
        const a4a = getA4A(fixture, defaultAttributes);
        expect(xhrMockJson.calledOnce, 'xhr.fetchJson called exactly once')
            .to.be.true;
        expect(getKeyInfoSetsSpy.calledOnce).to.be.true;

        // Check that we have the right number of keys.
        expect(a4a.keyInfoSetPromises_).to.not.be.null;
        expect(Array.isArray(a4a.keyInfoSetPromises_)).to.be.true;
        expect(a4a.keyInfoSetPromises_.length).to.equal(2);

        let validKeyCheck;
        let invalidKeyCheck;

        // Check that one key is valid and the other invalid.
        const testPromises = a4a.keyInfoSetPromises_.map(keyInfoSetPromise => {
          expect(keyInfoSetPromise).to.be.instanceof(Promise);
          return keyInfoSetPromise.then(keyInfoSet => {
            expect(keyInfoSet).to.not.be.null;
            expect(Array.isArray(keyInfoSet)).to.be.true;
            expect(keyInfoSet.length).to.equal(1);
            const keyInfoPromise = keyInfoSet[0];
            expect(keyInfoPromise).to.not.be.null;
            expect(keyInfoPromise).to.be.instanceof(Promise);
            return keyInfoPromise.then(keyInfo => {
              if (keyInfo) {
                expect(keyInfo.hash).to.not.be.null;
                expect(keyInfo.cryptoKey).to.not.be.null;
                expect(keyInfo.cryptoKey).to.be.instanceof(CryptoKey);
                validKeyCheck = true;
              } else {
                expect(keyInfo).to.be.null;
                invalidKeyCheck = true;
              }
            });
          });
        });
        return Promise.all(testPromises)
      });
    });

  });
});
