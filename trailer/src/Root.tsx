import "./index.css";
import { Composition } from "remotion";
import { AlloFlowTrailer } from "./AlloFlowTrailer";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AlloFlowTrailer"
        component={AlloFlowTrailer}
        durationInFrames={3380}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
