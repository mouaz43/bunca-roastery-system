function buildNav(path, role) {
  const is = (href) => path === href;

  const common = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" }
  ];

  const branch = [
    { href: "/orders/new", label: "Neue Bestellung", icon: "🛒" },
    { href: "/orders/mine", label: "Meine Bestellungen", icon: "📦" }
  ];

  const b2b = [
    { href: "/orders/new", label: "Bestellen", icon: "🛒" },
    { href: "/orders/mine", label: "Meine Bestellungen", icon: "📦" }
  ];

  const admin = [
    { href: "/admin", label: "Admin Dashboard", icon: "🛠️" },
    { href: "/admin/coffees", label: "Kaffeesorten", icon: "☕" },
    { href: "/admin/users", label: "Benutzer", icon: "👥" }
  ];

  let items = [...common];
  if (role === "branch") items.push(...branch);
  if (role === "b2b") items.push(...b2b);
  if (role === "admin") items.push(...admin);

  return items.map(i => ({ ...i, active: is(i.href) }));
}

module.exports = { buildNav };
