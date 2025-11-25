export const getTypeColor = (type: string) => {
  if (!type) return "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200";
  
  switch (type.toLowerCase()) {
    case "yoga": return "border-transparent bg-green-100 text-green-800 hover:bg-green-200";
    case "funcional": return "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200";
    case "spinning": return "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    case "pilates": return "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200";
    case "baile": return "border-transparent bg-pink-100 text-pink-800 hover:bg-pink-200";
    default: return "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200";
  }
};

export const getContrastingTextColor = (hexcolor: string | null | undefined): string => {
    if (!hexcolor) {
        return '#1f2937'; // default dark text (text-gray-800)
    }
    // If the hex color is invalid, return default
    if (!/^#[0-9A-F]{6}$/i.test(hexcolor)) {
        return '#1f2937';
    }

    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1f2937' : '#ffffff'; // return dark text for light colors, white for dark colors
}