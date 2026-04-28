export default async (request, context) => {
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();

  const gaCode = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SWZZY2HBZB"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-SWZZY2HBZB');
</script>
`;

  if (!html.includes("G-SWZZY2HBZB")) {
    html = html.replace("<head>", `<head>${gaCode}`);
  }

  return new Response(html, response);
};

export const config = {
  path: "/*"
};
