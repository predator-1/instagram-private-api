import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as Chance from 'chance';
import { Cookie, CookieJar, MemoryCookieStore } from 'tough-cookie';
import * as devices from '../samples/devices.json';
import * as builds from '../samples/builds.json';
import * as supportedCapabilities from '../samples/supported-capabilities.json';
import {
  APP_VERSION,
  APP_VERSION_CODE,
  BREADCRUMB_KEY,
  EXPERIMENTS,
  FACEBOOK_ANALYTICS_APPLICATION_ID,
  FACEBOOK_ORCA_APPLICATION_ID,
  FACEBOOK_OTA_FIELDS,
  HOST,
  LOGIN_EXPERIMENTS,
  SIGNATURE_KEY,
  SIGNATURE_VERSION,
} from './constants';
import { ChallengeStateResponse, CheckpointResponse } from '../responses';
import { IgCookieNotFoundError, IgNoCheckpointError, IgUserIdNotFoundError } from '../errors';

export class State {
  signatureKey: string = SIGNATURE_KEY;
  signatureVersion: string = SIGNATURE_VERSION;
  userBreadcrumbKey: string = BREADCRUMB_KEY;
  appVersion: string = APP_VERSION;
  appVersionCode: string = APP_VERSION_CODE;
  fbAnalyticsApplicationId: string = FACEBOOK_ANALYTICS_APPLICATION_ID;
  fbOtaFields: string = FACEBOOK_OTA_FIELDS;
  fbOrcaApplicationId: string = FACEBOOK_ORCA_APPLICATION_ID;
  loginExperiments: string = LOGIN_EXPERIMENTS;
  experiments: string = EXPERIMENTS;
  supportedCapabilities = supportedCapabilities;
  language: string = 'en_US';
  timezoneOffset: string = String(new Date().getTimezoneOffset() * -60);
  radioType = 'wifi-none';
  capabilitiesHeader = '3brTvw==';
  connectionTypeHeader = 'WIFI';
  deviceString: string;
  build: string;
  uuid: string;
  phoneId: string;
  /**
   * Google Play Advertising ID.
   *
   * The advertising ID is a unique ID for advertising, provided by Google
   * Play services for use in Google Play apps. Used by Instagram.
   *
   * @see https://support.google.com/googleplay/android-developer/answer/6048248?hl=en
   */
  adid: string;
  deviceId: string;
  proxyUrl: string;
  cookieStore = new MemoryCookieStore();
  cookieJar: CookieJar = new CookieJar();
  checkpoint: CheckpointResponse | null = null;
  challenge: ChallengeStateResponse | null = null;
  clientSessionIdLifetime: number = 1200000;
  pigeonSessionIdLifetime: number = 1200000;

  /**
   * The current application session ID.
   *
   * This is a temporary ID which changes in the official app every time the
   * user closes and re-opens the Instagram application or switches account.
   *
   * We will update it once an hour
   */
  public get clientSessionId(): string {
    return this.generateTemporaryGuid('clientSessionId', this.clientSessionIdLifetime);
  }

  public get pigeonSessionId(): string {
    return this.generateTemporaryGuid('pigeonSessionId', this.pigeonSessionIdLifetime);
  }

  public get appUserAgent() {
    return `Instagram ${this.appVersion} Android (${this.deviceString}; ${this.language}; ${this.appVersionCode})`;
  }

  public get webUserAgent() {
    return `Mozilla/5.0 (Linux; Android ${this.devicePayload.android_release}; ${this.devicePayload.model} Build/${
      this.build
    }; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Mobile Safari/537.36 ${
      this.appUserAgent
    }`;
  }

  public get devicePayload() {
    const deviceParts = this.deviceString.split(';');
    const [android_version, android_release] = deviceParts[0].split('/');
    const [manufacturer] = deviceParts[3].split('/');
    const model = deviceParts[4];
    return {
      android_version,
      android_release,
      manufacturer,
      model,
    };
  }

  public get batteryLevel() {
    const chance = new Chance(this.deviceId);
    const percentTime = chance.integer({ min: 200, max: 600 });
    return 100 - (Math.round(Date.now() / 1000 / percentTime) % 100);
  }

  public get isCharging() {
    const chance = new Chance(`${this.deviceId}${Math.round(Date.now() / 10800000)}`);
    return chance.bool();
  }

  public get challengeUrl() {
    if (!this.checkpoint) {
      throw new IgNoCheckpointError();
    }
    return `/api/v1${this.checkpoint.challenge.api_path}`;
  }

  public get cookieCsrfToken() {
    try {
      return this.extractCookieValue('csrftoken');
    } catch {
      return 'missing';
    }
  }

  public get cookieUserId() {
    return this.extractCookieValue('ds_user_id');
  }

  public get cookieUsername() {
    return this.extractCookieValue('ds_user');
  }

  public isExperimentEnabled(experiment) {
    return this.experiments.includes(experiment);
  }

  public extractCookie(key: string): Cookie | null {
    const cookies = this.cookieJar.getCookiesSync(HOST);
    return _.find(cookies, { key }) || null;
  }

  public extractCookieValue(key: string): string {
    const cookie = this.extractCookie(key);
    if (cookie === null) {
      throw new IgCookieNotFoundError(key);
    }
    return cookie.value;
  }

  public extractUserId(): string {
    try {
      return this.cookieUserId;
    } catch (e) {
      if (this.challenge === null || !this.challenge.user_id) {
        throw new IgUserIdNotFoundError();
      }
      return String(this.challenge.user_id);
    }
  }

  public async deserializeCookieJar(cookies: string) {
    this.cookieJar = await Bluebird.fromCallback(cb => CookieJar.deserialize(cookies, this.cookieStore, cb));
  }

  public async serializeCookieJar(): Promise<CookieJar.Serialized> {
    return Bluebird.fromCallback(cb => this.cookieJar.serialize(cb));
  }

  public generateDevice(seed: string): void {
    const chance = new Chance(seed);
    this.deviceString = chance.pickone(devices);
    const id = chance.string({
      pool: 'abcdef0123456789',
      length: 16,
    });
    this.deviceId = `android-${id}`;
    this.uuid = chance.guid();
    this.phoneId = chance.guid();
    this.adid = chance.guid();
    this.build = chance.pickone(builds);
  }

  private generateTemporaryGuid(seed: string, lifetime: number) {
    return new Chance(`${seed}${this.deviceId}${Math.round(Date.now() / lifetime)}`).guid();
  }

  public async export(): Promise<ExportState> {
    return {
      signatureKey: this.signatureKey,
      signatureVersion: this.signatureVersion,
      userBreadcrumbKey: this.userBreadcrumbKey,
      appVersion: this.appVersion,
      appVersionCode: this.appVersionCode,
      fbAnalyticsApplicationId: this.fbAnalyticsApplicationId,
      fbOtaFields: this.fbOtaFields,
      fbOrcaApplicationId: this.fbOrcaApplicationId,
      loginExperiments: this.loginExperiments,
      experiments: this.experiments,
      supportedCapabilities: this.supportedCapabilities,
      language: this.language,
      timezoneOffset: this.timezoneOffset,
      radioType: this.radioType,
      capabilitiesHeader: this.capabilitiesHeader,
      connectionTypeHeader: this.connectionTypeHeader,
      deviceString: this.deviceString,
      build: this.build,
      uuid: this.uuid,
      phoneId: this.phoneId,
      adid: this.adid,
      deviceId: this.deviceId,
      checkpoint: this.checkpoint,
      challenge: this.challenge,
      clientSessionIdLifetime: this.clientSessionIdLifetime,
      pigeonSessionIdLifetime: this.pigeonSessionIdLifetime,
      cookies: JSON.stringify(await this.serializeCookieJar()),
    };
  }

  public async import(exportState: ExportState): Promise<void> {
    this.signatureKey = exportState.signatureKey;
    this.signatureVersion = exportState.signatureVersion;
    this.userBreadcrumbKey = exportState.userBreadcrumbKey;
    this.appVersion = exportState.appVersion;
    this.appVersionCode = exportState.appVersionCode;
    this.fbAnalyticsApplicationId = exportState.fbAnalyticsApplicationId;
    this.fbOtaFields = exportState.fbOtaFields;
    this.fbOrcaApplicationId = exportState.fbOrcaApplicationId;
    this.loginExperiments = exportState.loginExperiments;
    this.experiments = exportState.experiments;
    this.supportedCapabilities = exportState.supportedCapabilities;
    this.language = exportState.language;
    this.timezoneOffset = exportState.timezoneOffset;
    this.radioType = exportState.radioType;
    this.capabilitiesHeader = exportState.capabilitiesHeader;
    this.connectionTypeHeader = exportState.connectionTypeHeader;
    this.deviceString = exportState.deviceString;
    this.build = exportState.build;
    this.uuid = exportState.uuid;
    this.phoneId = exportState.phoneId;
    this.adid = exportState.adid;
    this.deviceId = exportState.deviceId;
    this.checkpoint = exportState.checkpoint;
    this.challenge = exportState.challenge;
    this.clientSessionIdLifetime = exportState.clientSessionIdLifetime;
    this.pigeonSessionIdLifetime = exportState.pigeonSessionIdLifetime;
    await this.deserializeCookieJar(exportState.cookies);
  }
}

export interface ExportState {
  signatureKey: string;
  signatureVersion: string;
  userBreadcrumbKey: string;
  appVersion: string;
  appVersionCode: string;
  fbAnalyticsApplicationId: string;
  fbOtaFields: string;
  fbOrcaApplicationId: string;
  loginExperiments: string;
  experiments: string;
  supportedCapabilities: Array<
    | {
        name: string;
        value: string;
      }
    | {
        name: string;
        value: number;
      }
  >;
  language: string;
  timezoneOffset: string;
  radioType: string;
  capabilitiesHeader: string;
  connectionTypeHeader: string;
  deviceString: string;
  build: string;
  uuid: string;
  phoneId: string;
  adid: string;
  deviceId: string;
  cookies: string;
  checkpoint: CheckpointResponse;
  challenge: ChallengeStateResponse;
  clientSessionIdLifetime: number;
  pigeonSessionIdLifetime: number;
}
