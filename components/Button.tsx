export function Button(props: any) {
  return (
    <button
      type="button"
      {...props}
      className={`border border-gray-400 py-1 px-2 rounded-sm ${props.className}`}
    />
  );
}
