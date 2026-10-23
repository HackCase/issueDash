import Markdown from "react-markdown";
import { useParams } from "react-router-dom";
import NaoExiste from "../components/NaoExiste";
import Stepper from "../components/Stepper";
import { loadWizard, semFrontmatter } from "../lib/wizard";

export default function Ata() {
  const { reuniaoId = "" } = useParams();
  const wiz = loadWizard(reuniaoId);
  return (
    <div>
      <Stepper atual={0} reuniaoId={reuniaoId} />
      <h1 className="mb-4 text-2xl font-bold">Ata da reunião</h1>
      {wiz ? (
        <article className="ata rounded-card bg-superficie p-6 shadow-card">
          <Markdown>{semFrontmatter(wiz.ataMd)}</Markdown>
        </article>
      ) : (
        <NaoExiste onRecomecar={() => (location.href = "/reunioes/nova")} />
      )}
    </div>
  );
}
