// paperrocket-book: new file. Login card settings read from env.
import { afterEach, describe, expect, it } from "vitest";

import { getLoginButtonColor, getLoginLogoUrl, getOidcPublicProps } from "./oidc";

afterEach(() => {
  delete process.env.PR_LOGIN_BUTTON_COLOR;
  delete process.env.PR_LOGIN_LOGO_URL;
});

describe("login card settings", () => {
  it("takes a #rrggbb button colour and ignores anything else", () => {
    process.env.PR_LOGIN_BUTTON_COLOR = "#3066BB";
    expect(getLoginButtonColor()).toBe("#3066BB");
    for (const bad of ["red", "#fff", "#3066BBzz", "url(x)", ""]) {
      process.env.PR_LOGIN_BUTTON_COLOR = bad;
      expect(getLoginButtonColor()).toBeNull();
    }
  });

  it("takes an https logo or a same-site path, nothing else", () => {
    process.env.PR_LOGIN_LOGO_URL = "/brand-logo.svg";
    expect(getLoginLogoUrl()).toBe("/brand-logo.svg");
    process.env.PR_LOGIN_LOGO_URL = "https://cdn.example.test/logo.svg";
    expect(getLoginLogoUrl()).toBe("https://cdn.example.test/logo.svg");
    for (const bad of ["//evil.example/x.svg", "/\\evil.example", "http://plain.example/x.svg", "javascript:alert(1)"]) {
      process.env.PR_LOGIN_LOGO_URL = bad;
      expect(getLoginLogoUrl()).toBeNull();
    }
  });

  it("sends both to the login page", () => {
    process.env.PR_LOGIN_BUTTON_COLOR = "#3066BB";
    process.env.PR_LOGIN_LOGO_URL = "/brand-logo.svg";
    expect(getOidcPublicProps()).toMatchObject({ loginButtonColor: "#3066BB", loginLogoUrl: "/brand-logo.svg" });
  });
});
