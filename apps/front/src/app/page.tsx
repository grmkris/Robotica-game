import { CreateRobot } from "./_lib/robotLib/components/CreateRobot";

export default function Page() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-center text-4xl font-bold">
        Robot Battle Arena
      </h1>
      <CreateRobot />
    </main>
  );
}
