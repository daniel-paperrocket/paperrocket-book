/* eslint-disable @next/next/no-head-element */
// paperrocket-book: rewritten as the Paper Rocket letterhead (logo tile, brand stripe, eyebrow and left-aligned title,
// detail rows, button, centred footer), matching paperrocket-sign. Same props as upstream so every template that uses
// it still compiles; `headerType` is accepted and ignored (the round icon images are gone). `eyebrow` is new.
import EmailHead from "./EmailHead";
import type { BodyHeadType } from "./EmailSchedulingBodyHeader";
import RawHtml from "./RawHtml";
import {
  getBrandColour,
  getFooterLines,
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

const Letterhead = () => {
  const logo = getLogoUrl();
  const name = getLetterheadName();
  const home = getHomeUrl();
  return (
    <tr>
      <td align="center" style={{ padding: "32px 28px 24px", textAlign: "center" }}>
        <a href={home} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          {logo ? (
            <img
              src={logo}
              alt={name}
              width="72"
              height="72"
              style={{ display: "block", margin: "0 auto", border: 0, width: "72px", height: "72px" }}
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
      </td>
    </tr>
  );
};

const Divider = () => (
  <tr>
    <td style={{ padding: "0 28px" }}>
      <div style={{ borderTop: `1px solid ${PR_COLOURS.cardBorder}`, height: 0, lineHeight: 0, fontSize: 0 }}>
        &nbsp;
      </div>
    </td>
  </tr>
);

export const BaseEmailHtml = (props: {
  children: React.ReactNode;
  callToAction?: React.ReactNode;
  subject: string;
  title?: string;
  subtitle?: React.ReactNode | string;
  eyebrow?: string;
  headerType?: BodyHeadType;
  hideLogo?: boolean;
}) => {
  const brand = getBrandColour();
  const footerLines = getFooterLines();
  const home = getHomeUrl();
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
              <td align="center" style={{ padding: "20px 12px 40px" }}>
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
                    borderTop: `4px solid ${brand}`,
                    borderRadius: "6px",
                  }}>
                  <tbody>
                    <Letterhead />
                    <Divider />
                    {(props.title || props.subtitle || props.eyebrow) && (
                      <tr>
                        <td align="left" style={{ padding: "28px 28px 8px", textAlign: "left" }}>
                          {props.eyebrow && (
                            <div
                              style={{
                                fontFamily: PR_FONT_STACK,
                                fontSize: 12,
                                fontWeight: 600,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                lineHeight: "16px",
                                color: PR_COLOURS.muted,
                                marginBottom: 10,
                              }}>
                              {props.eyebrow}
                            </div>
                          )}
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
                    {props.callToAction && (
                      <tr>
                        <td align="left" style={{ padding: "20px 28px 8px" }}>
                          {props.callToAction}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td align="left" style={{ padding: "16px 28px 28px" }}>
                        <div
                          style={{
                            fontFamily: PR_FONT_STACK,
                            fontSize: 16,
                            fontWeight: 500,
                            textAlign: "left",
                            color: PR_COLOURS.ink,
                          }}>
                          {props.children}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td
                align="center"
                style={{
                  padding: "0 24px 40px",
                  fontFamily: PR_FONT_STACK,
                  fontSize: 12,
                  lineHeight: "19px",
                  color: PR_COLOURS.label,
                  textAlign: "center",
                }}>
                {!props.hideLogo && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: PR_COLOURS.ink }}>
                      {getLetterheadName()}
                    </div>
                    <div>{getFooterName()}</div>
                    {footerLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                    <div style={{ width: "24px", height: "1px", margin: "14px auto", backgroundColor: PR_COLOURS.line }}>
                      &nbsp;
                    </div>
                    <div>Questions? Reply to this email.</div>
                    <div style={{ marginTop: 10 }}>
                      <a href={home} style={{ color: PR_COLOURS.label }}>
                        {home.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </div>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </Html>
  );
};
