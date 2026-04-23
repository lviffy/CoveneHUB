interface LocalFontOptions {
  src: Array<{
    path: string;
    weight?: string;
    style?: string;
  }>;
  variable?: string;
}

export default function localFont(options: LocalFontOptions) {
  return {
    className: '',
    variable: options.variable ?? '',
    style: {},
  };
}
