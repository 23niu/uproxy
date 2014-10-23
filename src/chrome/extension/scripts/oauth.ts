/// <reference path='google_auth.ts' />

class OAuth {
  private googleAuth_ :GoogleAuth;

  constructor() {
    this.googleAuth_ = new GoogleAuth();
  }

  public getCredentials(network :string) {
    if (network === 'google') {
      this.googleAuth_.login();
    }
  }
}
