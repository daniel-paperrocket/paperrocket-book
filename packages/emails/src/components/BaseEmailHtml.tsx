/* eslint-disable @next/next/no-head-element */
// paperrocket-book: rewritten as a letterhead layout (name or logo, brand rule, plain title, quiet footer).
// Same props as upstream so every template that uses it still compiles. `headerType` is accepted and ignored
// (the round icon images are gone).
import EmailHead from "./EmailHead";
import type { BodyHeadType } from "./EmailSchedulingBodyHeader";
import RawHtml from "./RawHtml";
import {
  getBrandColour,
  getFooterName,
  getHomeUrl,
  getLetterheadName,
  getLogoUrl,
  PR_COLOURS,
  PR_FONT_STACK,
} from "./paperrocket-letterhead";

const Html = (props: { children: React.ReactNode }) => (
  <>
    <RawHtml html="<!doctype html>" />
    <html>{props.children}</html>
  </>
);

const Letterhead = ({ brand }: { brand: string }) => {
  const logo = getLogoUrl();
  const name = getLetterheadName();
  const home = getHomeUrl();
  return (
    <tr>
      <td align="center" style={{ padding: "40px 40px 28px", textAlign: "center" }}>
        <a href={home} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          {logo ? (
            <img
              src={logo}
              alt={name}
              height="40"
              style={{ display: "block", margin: "0 auto", border: 0, height: "40px", maxWidth: "100%" }}
            />
          ) : (
            <span
              style={{
                display: "inline-block",
                font: `700 22px/30px ${PR_FONT_STACK}`,
                letterSpacing: "-0.01em",
                color: PR_COLOURS.ink,
              }}>
              {name}
            </span>
          )}
        </a>
        <div style={{ width: "40px", height: "3px", margin: "18px auto 0", backgroundColor: brand }} />
      </td>
    </tr>
  );
};

export const BaseEmailHtml = (props: {
  children: React.ReactNode;
  callToAction?: React.ReactNode;
  subject: string;
  title?: string;
  subtitle?: React.ReactNode | string;
  headerType?: BodyHeadType;
  hideLogo?: boolean;
}) => {
  const brand = getBrandColour();
  return (
    <Html>
      <EmailHead title={props.subject} />
      <body style={{ margin: 0, wordSpacing: "normal", backgroundColor: PR_COLOURS.page }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ width: "100%", backgroundColor: PR_COLOURS.page }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "32px 12px 40px" }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    backgroundColor: PR_COLOURS.card,
                    border: `1px solid ${PR_COLOURS.cardBorder}`,
                    borderRadius: "6px",
                  }}>
                  <tbody>
                    <Letterhead brand={brand} />
                    {(props.title || props.subtitle) && (
                      <tr>
                        <td align="center" style={{ padding: "0 40px 8px", textAlign: "center" }}>
                          {props.title && (
                            <div
                              data-testid="heading"
                              style={{
                                fontFamily: PR_FONT_STACK,
                                fontSize: 26,
                                fontWeight: 700,
                                lineHeight: "32px",
                                color: PR_COLOURS.ink,
                              }}>
                              {props.title}
                            </div>
                          )}
                          {props.subtitle && (
                            <div
                              data-testid="subHeading"
                              style={{
                                fontFamily: PR_FONT_STACK,
                                fontSize: 16,
                                fontWeight: 400,
                                lineHeight: "24px",
                                color: PR_COLOURS.muted,
                                marginTop: 8,
                              }}>
                              {props.subtitle}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td align="left" style={{ padding: "24px 40px 8px" }}>
                        <div
                          style={{
                            fontFamily: PR_FONT_STACK,
                            fontSize: 16,
                            fontWeight: 500,
                            lineHeight: 1,
                            textAlign: "left",
                            color: PR_COLOURS.ink,
                          }}>
                          {props.children}
                        </div>
                      </td>
                    </tr>
                    {props.callToAction && (
                      <tr>
                        <td align="center" style={{ padding: "8px 40px 32px" }}>
                          {props.callToAction}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: "0 40px" }}>
                        <div style={{ borderTop: `1px solid ${PR_COLOURS.line}`, height: 0 }} />
                      </td>
                    </tr>
                    <tr>
                      <td
                        align="center"
                        style={{
                          padding: "20px 40px 28px",
                          fontFamily: PR_FONT_STACK,
                          fontSize: 12,
                          lineHeight: "19px",
                          color: PR_COLOURS.label,
                          textAlign: "center",
                        }}>
                        {!props.hideLogo && <div>{getFooterName()}</div>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </Html>
  );
};
