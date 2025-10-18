// Endpoint dezafectat: autentificarea este gestionată de NextAuth (/api/auth/[...nextauth])
export async function POST() {
  return new Response(JSON.stringify({ error: 'Foloseste /api/auth/[...nextauth]' }), { status: 410 });
}
