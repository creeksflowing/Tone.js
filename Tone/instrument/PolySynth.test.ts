import { expect } from "chai";
import { BasicTests } from "test/helper/Basic";
import { CompareToFile } from "test/helper/CompareToFile";
import { InstrumentTest } from "test/helper/InstrumentTests";
import { atTime, Offline } from "test/helper/Offline";
import { OutputAudio } from "test/helper/OutputAudio";
import { PolySynth } from "./PolySynth";
import { Synth } from "./Synth";

describe("PolySynth", () => {

	BasicTests(PolySynth);
	InstrumentTest(PolySynth, "C4");

	it("matches a file", () => {
		return CompareToFile(() => {
			const synth = new PolySynth(2).toDestination();
			synth.triggerAttackRelease("C4", 0.2, 0);
			synth.triggerAttackRelease("C4", 0.1, 0.1);
			synth.triggerAttackRelease("E4", 0.1, 0.2);
			synth.triggerAttackRelease("E4", 0.1, 0.3);
			synth.triggerAttackRelease("G4", 0.1, 0.4);
			synth.triggerAttackRelease("B4", 0.1, 0.4);
			synth.triggerAttackRelease("C4", 0.2, 0.5);
		}, "polySynth.wav", 0.6);
	});

	it("matches another file", () => {
		return CompareToFile(() => {
			const synth = new PolySynth(4).toDestination();
			synth.triggerAttackRelease(["C4", "E4", "G4", "B4"], 0.2, 0);
			synth.triggerAttackRelease(["C4", "E4", "G4", "B4"], 0.2, 0.3);
		}, "polySynth2.wav", 0.6);
	});

	it("matches a file and chooses the right voice", () => {
		return CompareToFile(() => {
			const synth = new PolySynth(3).toDestination();
			synth.triggerAttackRelease(["C4", "E4"], 1, 0);
			synth.triggerAttackRelease("G4", 0.1, 0.2);
			synth.triggerAttackRelease("B4", 0.1, 0.4);
			synth.triggerAttackRelease("G4", 0.1, 0.6);
		}, "polySynth3.wav", 0.5);
	});

	context("Voice Stealing", () => {

		it ("will run out of notes when voice stealing is set to 'none'", () => {
			return Offline(() => {
				const polySynth = new PolySynth(2);
				polySynth.set({ envelope: { release : 0.1 } });
				expect(polySynth.voiceStealing).to.equal("none");
				polySynth.triggerAttackRelease("C4", 0.1, 0.1);
				polySynth.triggerAttackRelease("D4", 0.1, 0.2);
				polySynth.triggerAttackRelease("E4", 0.1, 0.2);
				return [
					atTime(0.1, () => {
						expect(polySynth.activeVoices).to.equal(2);
					}),
					atTime(0.3, () => {
						expect(polySynth.activeVoices).to.equal(1);
					}),
					atTime(0.4, () => {
						expect(polySynth.activeVoices).to.equal(0);
					}),
				];
			}, 1);
		});

		it ("will steal voice when voice stealing is set to 'lowest'", () => {
			return Offline(() => {
				const polySynth = new PolySynth({
					polyphony : 2,
					voiceStealing : "lowest",
				});
				expect(polySynth.voiceStealing).to.equal("lowest");
				polySynth.set({ envelope: { release : 0.1 } });
				polySynth.triggerAttackRelease("C4", 0.1, 0.1);
				polySynth.triggerAttackRelease("D4", 0.1, 0.2);
				polySynth.triggerAttackRelease("E4", 0.1, 0.2);
				return [
					atTime(0.1, () => {
						expect(polySynth.activeVoices).to.equal(2);
					}),
					atTime(0.3, () => {
						expect(polySynth.activeVoices).to.equal(2);
					}),
					atTime(0.4, () => {
						expect(polySynth.activeVoices).to.equal(0);
					}),
				];
			}, 1);
		});

		it ("will steal voice when voice stealing is set to 'highest'", () => {
			return Offline(() => {
				const polySynth = new PolySynth({
					polyphony : 2,
					voiceStealing : "highest",
				});
				expect(polySynth.voiceStealing).to.equal("highest");
				polySynth.set({ envelope: { release : 0.1 } });
				polySynth.triggerAttackRelease("D4", 0.1, 0.1);
				polySynth.triggerAttackRelease("C4", 0.1, 0.2);
				polySynth.triggerAttackRelease("E4", 0.1, 0.2);
				return [
					atTime(0.1, () => {
						expect(polySynth.activeVoices).to.equal(2);
					}),
					atTime(0.3, () => {
						expect(polySynth.activeVoices).to.equal(2);
					}),
					atTime(0.4, () => {
						expect(polySynth.activeVoices).to.equal(0);
					}),
				];
			}, 1);
		});
	});

	context("Playing Notes", () => {

		it("triggerAttackRelease can take an array of durations", () => {
			return OutputAudio(() => {
				const polySynth = new PolySynth(2);
				polySynth.toDestination();
				polySynth.triggerAttackRelease(["C4", "D4"], [0.1, 0.2]);
			});
		});

		it("triggerAttack and triggerRelease can be invoked without arrays", () => {
			return Offline(() => {
				const polySynth = new PolySynth(2);
				polySynth.set({ envelope: { release : 0.1 } });
				polySynth.toDestination();
				polySynth.triggerAttack("C4", 0);
				polySynth.triggerRelease("C4", 0.1);
			}, 0.3).then(buffer => {
				expect(buffer.getTimeOfFirstSound()).to.be.closeTo(0, 0.01);
				expect(buffer.getValueAtTime(0.2)).to.be.closeTo(0, 0.01);
			});
		});

		it("can stop all of the currently playing sounds", () => {
			return Offline(() => {
				const polySynth = new PolySynth(4);
				polySynth.set({ envelope: { release : 0.1 } });
				polySynth.toDestination();
				polySynth.triggerAttack(["C4", "E4", "G4", "B4"], 0);
				polySynth.releaseAll(0.1);
			}, 0.3).then((buffer) => {
				expect(buffer.getTimeOfFirstSound()).to.be.closeTo(0, 0.01);
				expect(buffer.getTimeOfLastSound()).to.be.closeTo(0.2, 0.01);
			});
		});

		it("is silent before being triggered", () => {
			return Offline(() => {
				const polySynth = new PolySynth(2);
				polySynth.toDestination();
			}).then((buffer) => {
				expect(buffer.isSilent()).to.be.true;
			});
		});

		it("can be scheduled to start in the future", () => {
			return Offline(() => {
				const polySynth = new PolySynth(2);
				polySynth.toDestination();
				polySynth.triggerAttack("C4", 0.1);
			}, 0.3).then((buffer) => {
				expect(buffer.getTimeOfFirstSound()).to.be.closeTo(0.1, 0.01);
			});
		});

		it("reports the active notes", () => {
			return Offline(() => {
				const polySynth = new PolySynth(2);
				polySynth.set({ envelope: { release : 0.1 } });
				polySynth.toDestination();
				polySynth.triggerAttackRelease("C4", 0.1, 0.1);
				polySynth.triggerAttackRelease("D4", 0.1, 0.2);
				return [
					atTime(0.1, () => {
						expect(polySynth.activeVoices).to.equal(2);
					}),
					atTime(0.3, () => {
						expect(polySynth.activeVoices).to.equal(1);
					}),
					atTime(0.4, () => {
						expect(polySynth.activeVoices).to.equal(0);
					}),
				];
			}, 1);
		});

	});

	context("API", () => {

		it("can be constructed with an options object", () => {
			const polySynth = new PolySynth(4, Synth, {
				envelope : {
					sustain : 0.3,
				},
			});
			expect(polySynth.get().envelope.sustain).to.equal(0.3);
			polySynth.dispose();
		});

		it("can pass in the volume and detune", () => {
			const polySynth = new PolySynth({
				volume : -12,
			});
			expect(polySynth.volume.value).to.be.closeTo(-12, 0.1);
			polySynth.dispose();
		});

		it("can get/set attributes", () => {
			const polySynth = new PolySynth();
			polySynth.set({
				envelope : {decay : 3},
			});
			expect(polySynth.get().envelope.decay).to.equal(3);
			polySynth.dispose();
		});

	});
});
