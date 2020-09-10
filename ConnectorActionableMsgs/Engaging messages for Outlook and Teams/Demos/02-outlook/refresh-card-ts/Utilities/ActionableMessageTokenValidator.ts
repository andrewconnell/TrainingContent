import axios from 'axios';
import { AxiosResponse } from "axios";
const getPem = require('rsa-pem-from-mod-exp');
const base64url = require('base64url');
import * as jwt from 'jsonwebtoken';
import { OpenIdMetadata } from './OpenIdMetadata';
import * as debug from 'debug';

// init debug logging module
const log = debug('msoutlook-actionablemessages');

// Office 365 constants
const OFFICE365_APP_ID = "48af08dc-f6d2-435f-b2a7-069abd99c086";
const OFFICE365_OPENID_METADATA_URL = "https://substrate.office.com/sts/common/.well-known/openid-configuration";
const OFFICE365_TOKEN_ISSUER = "https://substrate.office.com/sts/";

class ActionableMessageTokenValidatorResult {
  constructor(public sender: String | undefined, public actionPerformer: String | undefined) { }
}

/**
 * Validates an actionable message token.
 * @param token
 *   A JWT issued by Microsoft.
 *
 * @param targetUrl
 *   The expected URL in the token. This should the web service URL.
 *
 * @param cb
 *   The callback when the validation is completed.
 */
class ActionableMessageTokenValidator {
  public validateToken(token: string, targetUrl: string, callback): void {
    const decodedJwt: any = jwt.decode(token, { complete: true });
    log(`Decoded JWT`, decodedJwt);

    const verifyOptions = {
      issuer: OFFICE365_TOKEN_ISSUER,
      audience: targetUrl
    };

    // get openid metadata from o365
    const openIdConfig = new OpenIdMetadata(OFFICE365_OPENID_METADATA_URL);

    // get the matching key from the token
    openIdConfig.getKey(decodedJwt.header.kid, (key) => {
      let result = new ActionableMessageTokenValidatorResult(undefined, undefined);

      if (key) {
        try {
          // verify the token has valid claims
          jwt.verify(token, key, verifyOptions);
          if (decodedJwt.payload.appid.toLowerCase() !== OFFICE365_APP_ID.toLowerCase()) {
            let error = new Error('Invalid app ID');
            Error.captureStackTrace(error);
            callback(error);
          } else {
            result = new ActionableMessageTokenValidatorResult(
              decodedJwt.payload.sender,
              decodedJwt.payload.sub
            );
          }
        } catch (error) {
          callback(error);
          return;
        }
      } else {
        let error = new Error('Invalid key');
        Error.captureStackTrace(error);
        callback(error);
      }

      callback(null, result);
    });
  }
}

export { ActionableMessageTokenValidator };
export { ActionableMessageTokenValidatorResult }