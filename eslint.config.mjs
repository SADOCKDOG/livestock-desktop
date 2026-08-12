export default [
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "TemplateLiteral > TemplateElement[value.raw=/style=\"/]",
          "message": "PROHIBIDO el uso de inline styles (style=\"...\") en templates. Usa clases CSS de utilidad de tu sistema de diseño."
        }
      ]
    }
  }
];
