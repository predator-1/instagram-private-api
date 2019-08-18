import { defaultsDeep, inRange, random } from 'lodash';
import { createHmac } from 'crypto';
import { Subject } from 'rxjs';
import { AttemptOptions, retry } from '@lifeomic/attempt';
import { IgApiClient } from './client';
import {
  IgActionSpamError,
  IgCheckpointError,
  IgClientError,
  IgLoginRequiredError,
  IgNetworkError,
  IgNotFoundError,
  IgPrivateUserError,
  IgResponseError,
  IgSentryBlockError,
} from '../errors';
import JSONbigInt = require('json-bigint');
import { IgResponse } from '../types/common.types';
import * as got from 'got';
import { Response, GotOptions, GotFormOptions, GotBodyOptions } from 'got';
import { httpsOverHttp } from 'tunnel';
import * as FormData from 'form-data';

interface IOptions {
  url: string;
  qs?: any;
  method?: string;
  headers?: { [key: string]: any };
  form?: Record<string, any>;
}

interface IOptionsFormData extends IOptions {
  formData: FormData;
}

interface IOptionsBody extends IOptions {
  body: Buffer;
}

const JSONbigString = JSONbigInt({ storeAsString: true });

type Payload = { [key: string]: any } | string;

interface SignedPost {
  signed_body: string;
  ig_sig_key_version: string;
}

export class Request {
  end$ = new Subject();
  error$ = new Subject<IgClientError>();
  attemptOptions: Partial<AttemptOptions<any>> = {
    maxAttempts: 1,
  };
  defaults: Partial<GotBodyOptions<string>> = {
    baseUrl: 'https://i.instagram.com/',
    rejectUnauthorized: false,
    decompress: false,
    headers: this.getDefaultHeaders(),
    hooks: {
      afterResponse: [
        response => {
          if (response.body) {
            try {
              response.body = JSONbigString.parse(response.body as string);
            } catch (e) {
              if (inRange(response.statusCode, 200, 299)) {
                throw e;
              }
            }
          }
          return response;
        },
      ],
    },
  };

  constructor(private client: IgApiClient) {}

  public async sendFormData<T = any>(incomeOptions: IOptionsFormData): Promise<IgResponse<T>> {
    return await this.sendRequest({ body: incomeOptions.formData } as GotBodyOptions<string>, incomeOptions);
  }

  public async sendBody<T = any>(incomeOptions: IOptionsBody): Promise<IgResponse<T>> {
    return await this.sendRequest({ body: incomeOptions.body } as GotBodyOptions<string>, incomeOptions);
  }

  public async send<T = any>(incomeOptions: IOptions): Promise<IgResponse<T>> {
    if (incomeOptions.form) {
      const options: GotFormOptions<string> = {
        body: incomeOptions.form,
        form: true,
      };
      return await this.sendRequest(options, incomeOptions);
    }
    return await this.sendRequest({}, incomeOptions);
  }

  private async sendRequest<T = any>(data: GotOptions<string>, incomeOptions: IOptions): Promise<IgResponse<T>> {
    if (this.client.state.proxyUrl) {
      const prx = this.client.state.proxyUrl.split(':');
      data.agent = httpsOverHttp({
        proxy: {
          host: prx[0],
          port: parseInt(prx[1], 10),
        },
      });
    }
    const options: GotOptions<string> = defaultsDeep(
      data,
      {
        query: incomeOptions.qs,
        method: incomeOptions.method,
        headers: incomeOptions.headers,
        cookieJar: this.client.state.cookieJar,
      },
      this.defaults,
    );
    const response = await this.faultTolerantRequest(incomeOptions.url, options);
    process.nextTick(() => this.end$.next());
    if (response.body.status === 'ok') {
      return response;
    }
    const error = this.handleResponseError(response);
    process.nextTick(() => this.error$.next(error));
    throw error;
  }

  public signature(data: string) {
    return createHmac('sha256', this.client.state.signatureKey)
      .update(data)
      .digest('hex');
  }

  public sign(payload: Payload): SignedPost {
    const json = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    const signature = this.signature(json);
    return {
      ig_sig_key_version: this.client.state.signatureVersion,
      signed_body: `${signature}.${json}`,
    };
  }

  public userBreadcrumb(size: number) {
    const term = random(2, 3) * 1000 + size + random(15, 20) * 1000;
    const textChangeEventCount = Math.round(size / random(2, 3)) || 1;
    const data = `${size} ${term} ${textChangeEventCount} ${Date.now()}`;
    const signature = Buffer.from(
      createHmac('sha256', this.client.state.userBreadcrumbKey)
        .update(data)
        .digest('hex'),
    ).toString('base64');
    const body = Buffer.from(data).toString('base64');
    return `${signature}\n${body}\n`;
  }

  private handleResponseError(response: Response<any>): IgClientError {
    const json = response.body;
    if (json.spam) {
      return new IgActionSpamError(response);
    }
    if (response.statusCode === 404) {
      return new IgNotFoundError(response);
    }
    if (typeof json.message === 'string') {
      if (json.message === 'challenge_required') {
        this.client.state.checkpoint = json;
        return new IgCheckpointError(response);
      }
      if (['user_has_logged_out', 'login_required'].includes(json.message)) {
        return new IgLoginRequiredError(response);
      }
      if (json.message.toLowerCase() === 'not authorized to view user') {
        return new IgPrivateUserError(response);
      }
    }
    if (json.error_type === 'sentry_block') {
      return new IgSentryBlockError(response);
    }
    return new IgResponseError(response);
  }

  private async faultTolerantRequest(url: string, options: GotOptions<string>) {
    try {
      return await retry(async () => got(url, options), this.attemptOptions);
    } catch (err) {
      throw new IgNetworkError(err);
    }
  }

  private getDefaultHeaders(): { [key: string]: any } {
    // TODO: unquoted Host and Connection?!
    return {
      'User-Agent': this.client.state.appUserAgent,
      'X-Pigeon-Session-Id': this.client.state.pigeonSessionId,
      'X-Pigeon-Rawclienttime': (Date.now() / 1000).toFixed(3),
      'X-IG-Connection-Speed': `${random(1000, 3700)}kbps`,
      'X-IG-Bandwidth-Speed-KBPS': '-1.000',
      'X-IG-Bandwidth-TotalBytes-B': '0',
      'X-IG-Bandwidth-TotalTime-MS': '0',
      'X-IG-Connection-Type': this.client.state.connectionTypeHeader,
      'X-IG-Capabilities': this.client.state.capabilitiesHeader,
      'X-IG-App-ID': this.client.state.fbAnalyticsApplicationId,
      'X-IG-VP9-Capable': true,
      'Accept-Language': this.client.state.language.replace('_', '-'),
      Host: 'i.instagram.com',
      'Accept-Encoding': 'gzip',
      Connection: 'Keep-Alive',
    };
  }
}
