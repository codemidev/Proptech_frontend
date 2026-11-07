if (typeof window !== "undefined" && !(window as any).__headerTraceInstalled) {
  (window as any).__headerTraceInstalled = true;

  const describe = (value: unknown) => {
    const str = String(value ?? "");
    const codes = Array.from(str, (c) => c.codePointAt(0));
    const badIndex = codes.findIndex((c) => (c ?? 0) > 255);
    return { str, length: str.length, badIndex, badCode: codes[badIndex] };
  };

  const wrap = (obj: any, method: string, label: string) => {
    const original = obj[method];
    if (!original) return;
    obj[method] = function (...args: any[]) {
      try {
        return original.apply(this, args);
      } catch (err) {
        console.error(`[header-trace] ${label} threw`, {
          args: args.map(describe),
        });
        console.trace(`[header-trace] ${label} stack`);
        throw err;
      }
    };
  };

  wrap(Headers.prototype, "set", "Headers.set");
  wrap(Headers.prototype, "append", "Headers.append");
  wrap(XMLHttpRequest.prototype, "setRequestHeader", "XHR.setRequestHeader");

  const OriginalHeaders = window.Headers;
  window.Headers = function (this: any, init?: any) {
    try {
      return new OriginalHeaders(init);
    } catch (err) {
      console.error("[header-trace] Headers constructor threw", { init });
      console.trace("[header-trace] Headers() stack");
      throw err;
    }
  } as any;
  window.Headers.prototype = OriginalHeaders.prototype;
}
