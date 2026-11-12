// paperrocket-book: detail rows are label-left, value-right (like the paperrocket-sign letterhead). Same props as upstream.
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";

import { PR_COLOURS, PR_FONT_STACK } from "./paperrocket-letterhead";

export const Info = (props: {
  label: string;
  description: React.ReactNode | undefined | null;
  extraInfo?: React.ReactNode;
  withSpacer?: boolean;
  lineThrough?: boolean;
  formatted?: boolean;
  isLabelHTML?: boolean;
}) => {
  if (!props.description || props.description === "") return null;

  const safeDescription = markdownToSafeHTML(props.description.toString()) || "";
  const safeLabel = markdownToSafeHTML(props.label.toString());

  const StyledHtmlContent = ({ htmlContent }: { htmlContent: string }) => {
    const css = `color: ${PR_COLOURS.ink}; font-weight: 400; line-height: 24px; margin: 0;`;
    return (
      <div
        // eslint-disable-next-line react/no-danger
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via markdownToSafeHTML
        dangerouslySetInnerHTML={{
          __html: htmlContent
            .replaceAll("<p>", `<p style="${css}">`)
            .replaceAll("<li>", `<li style="${css}">`),
        }}
      />
    );
  };

  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ width: "100%", borderTop: `1px solid ${PR_COLOURS.cardBorder}` }}>
      <tbody>
        <tr>
          <td
            valign="top"
            width="110"
            style={{
              width: "110px",
              padding: "12px 12px 12px 0",
              fontFamily: PR_FONT_STACK,
              fontSize: 14,
              fontWeight: 400,
              lineHeight: "22px",
              color: PR_COLOURS.muted,
              textAlign: "left",
            }}>
            {props.isLabelHTML ? <StyledHtmlContent htmlContent={safeLabel} /> : props.label}
          </td>
          <td
            valign="top"
            style={{
              padding: "12px 0",
              fontFamily: PR_FONT_STACK,
              fontSize: 15,
              fontWeight: 400,
              lineHeight: "22px",
              color: PR_COLOURS.ink,
              whiteSpace: "pre-wrap",
              textAlign: "left",
              textDecoration: props.lineThrough ? "line-through" : undefined,
            }}>
            {props.formatted ? <StyledHtmlContent htmlContent={safeDescription} /> : props.description}
            {props.extraInfo}
          </td>
        </tr>
      </tbody>
    </table>
  );
};
