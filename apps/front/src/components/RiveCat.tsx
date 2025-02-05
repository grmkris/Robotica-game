import { useIsAIResponding } from "@/app/_lib/catLib/catHooks";
import { useRive } from "@rive-app/react-canvas";
import { useEffect } from "react";

export const RiveCat = () => {
  const isThinking = useIsAIResponding();
  const { RiveComponent, rive } = useRive({
    src: "/misha.riv",
    stateMachines: "State Machine 1",
    autoplay: true,
    artboard: "Artboard 1",
  });

  // Update thinking state when props change
  useEffect(() => {
    if (rive) {
      const thinkingInput = rive
        .stateMachineInputs("State Machine 1")
        .find((input) => input.name === "IsThinking");
      if (thinkingInput) {
        thinkingInput.value = isThinking;
      }

      const meowInput = rive
        .stateMachineInputs("State Machine 1")
        .find((input) => input.name === "meowIndex");
      console.log("meowInput", meowInput);
      if (meowInput) {
        // Generate random number between 1 and 4
        const randomMeow = Math.floor(Math.random() * 4) + 1;
        meowInput.value = randomMeow;
      }
    }
  }, [rive, isThinking]);

  return (
    <div style={{ width: "600px", height: "600px" }}>
      <RiveComponent />
    </div>
  );
};
