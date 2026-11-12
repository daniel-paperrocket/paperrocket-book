// paperrocket-book: a plain table button in the brand colour (works in Gmail and Outlook), same props as upstream.
// Icons are not drawn any more (the icon images are gone).
import { getBrandColour, PR_COLOURS, PR_FONT_STACK } from "./paperrocket-letterhead";

export const CallToAction = (props: {
  label: string;
  href?: string;
  secondary?: boolean;
  startIconName?: string;
  endIconName?: string;
}) => {
  const { label, href, secondary } = props;
  const brand = getBrandColour();
  const style = {
    display: "inline-block",
    minWidth: "120px",
    padding: "13px 22px",
    borderRadius: "6px",
    border: `1px solid ${secondary ? PR_COLOURS.line : brand}`,
    backgroundColor: secondary ? PR_COLOURS.card : brand,
    color: secondary ? PR_COLOURS.ink : "#FFFFFF",
    fontFamily: PR_FONT_STACK,
    fontSize: "16px",
    fontWeight: 600,
    lineHeight: "20px",
    textAlign: "center" as const,
    textDecoration: "none",
    cursor: "pointer",
  };
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "8px 0 16px" }}>
      <tbody>
        <tr>
          <td>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer" style={style}>
                {label}
              </a>
            ) : (
              <button type="submit" style={style}>
                {label}
              </button>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
};
