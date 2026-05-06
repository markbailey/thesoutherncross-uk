import NewServerForm from './NewServerForm';
import { listAllGames } from '../../../../lib/repos/games';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function NewServerPage() {
  const games = listAllGames();
  return <NewServerForm games={games.map((g) => ({ id: g.id, name: g.name }))} />;
}
