import { IgClientError } from './ig-client.error';
import { Enumerable } from '../decorators';
import { IgResponse } from '../types/common.types';

export class IgResponseError<TBody extends { [x: string]: any } = any> extends IgClientError {
  @Enumerable(false)
  public text: string;
  @Enumerable(false)
  public response: IgResponse<TBody>;

  constructor(response: IgResponse<TBody>) {
    super(
      response.body.message ||
        `${response.method} ${response.requestUrl} - ${response.statusCode} ${response.statusMessage};`,
    );
    this.response = response;
    if (response.body.message) {
      this.text = response.body.message;
    }
  }
}
