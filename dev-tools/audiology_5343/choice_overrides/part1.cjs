'use strict';

module.exports = [
  {
    id: 'AU0.0',
    correct: 'They transform acoustic energy and improve impedance matching between ear-canal air and cochlear fluid.',
    distractors: [
      'They generate electrical action potentials directly and send them along the eighth nerve to the brainstem.',
      'They decode complex speech phonology and extract word meaning before signals reach the auditory cortex.',
      'They pump ions across cochlear membranes to equalize endolymph and perilymph chemical concentrations.',
    ],
    notes: [
      'Neural action potentials originate at the inner hair cell and auditory-nerve synapse rather than inside the mechanical middle-ear ossicles.',
      'Speech perception and meaning analysis take place across central auditory and language networks rather than in the ossicular chain.',
      'The stria vascularis maintains cochlear fluid composition and endocochlear potential, whereas the ossicles transfer mechanical energy.',
    ],
  },
  {
    id: 'AU0.1',
    correct: 'The basal end of the cochlea near the oval window.',
    distractors: [
      'The apical end of the cochlea near the helicotrema.',
      'The air-filled middle-ear cavity behind the eardrum.',
      'The primary auditory cortex prior to cochlear tuning.',
    ],
    notes: [
      'The wider, more flexible apical membrane near the helicotrema responds maximally to low-frequency rather than high-frequency sounds.',
      'The middle-ear space transmits broad acoustic energy mechanically via the ossicles and does not perform tonotopic cochlear filtering.',
      'Tonotopic frequency separation begins along the basilar membrane inside the cochlea before ascending signals reach auditory cortex.',
    ],
  },
  {
    id: 'AU0.2',
    correct: 'They provide active cochlear amplification and sharpen frequency selectivity along the basilar membrane.',
    distractors: [
      'They contract the stapedius muscle reflexively to stiffen the ossicular chain during loud sound exposure.',
      'They generate the resting endocochlear potential independently without contributions from the stria vascularis.',
      'They carry nearly all vestibular balance afferents from the semicircular canals into the central brainstem.',
    ],
    notes: [
      'The stapedius is a middle-ear skeletal muscle innervated by the facial nerve rather than driven by cochlear outer hair cells.',
      'The stria vascularis generates and maintains the positive endocochlear potential that powers hair-cell transduction in scala media.',
      'Vestibular hair cells in the otolith organs and semicircular canals—not cochlear outer hair cells—encode balance afferents.',
    ],
  },
  {
    id: 'AU0.3',
    correct: 'They transduce cochlear motion into neural signals carried by most auditory-nerve afferent fibers.',
    distractors: [
      'They serve as the main electromotile cochlear amplifier that sharpens mechanical basilar-membrane tuning.',
      'They contract periodically during swallowing to open the Eustachian tube and ventilate the middle ear.',
      'They regulate middle-ear static air pressure directly across changing ambient atmospheric altitudes.',
    ],
    notes: [
      'Outer hair cells—not inner hair cells—provide the active mechanical amplification and sharp frequency tuning of the cochlea.',
      'Tensor veli palatini and palatal muscles open the Eustachian tube during swallowing rather than cochlear sensory receptor cells.',
      'Middle-ear pressure equalization depends on Eustachian-tube ventilation and mucosa, whereas inner hair cells perform sensory transduction.',
    ],
  },
  {
    id: 'AU0.4',
    correct: 'The vestibulocochlear nerve, cranial nerve VIII.',
    distractors: [
      'The visual optic nerve, cranial nerve II.',
      'The motor facial nerve, cranial nerve VII.',
      'The tongue hypoglossal nerve, cranial nerve XII.',
    ],
    notes: [
      'Cranial nerve II carries visual information from retinal ganglion cells to the brain and conveys no auditory or vestibular input.',
      'Cranial nerve VII supplies facial expression muscles, taste, and the stapedius muscle rather than carrying cochlear and vestibular afferents.',
      'Cranial nerve XII innervates intrinsic and extrinsic tongue muscles for speech and swallowing rather than auditory or balance pathways.',
    ],
  },
  {
    id: 'AU0.5',
    correct: 'Auditory signals ascend through extensive bilateral pathways above the level of the cochlear nuclei.',
    distractors: [
      'Each cochlea projects strictly to the contralateral auditory cortex without any ipsilateral brainstem fibers.',
      'The middle-ear ossicles reroute mechanical vibrations to restore damaged neurons in the central auditory brainstem.',
      'Ascending central auditory tracts above the brainstem carry vestibular balance signals rather than acoustic timing cues.',
    ],
    notes: [
      'Because fibers cross and remain ipsilateral above the cochlear nucleus, each hemisphere receives rich input from both ears.',
      'The middle ear conducts sound mechanically to the cochlea and cannot repair or bypass central neural pathway lesions.',
      'Central auditory pathways process intensity, timing, and speech features from both cochleae rather than carrying vestibular input alone.',
    ],
  },
  {
    id: 'AU0.6',
    correct: 'Twenty times the base-10 logarithm of the ratio between the two sound pressures.',
    distractors: [
      'Ten times the arithmetic pressure difference measured directly in linear pascals.',
      'The squared ratio of the two sound pressures without applying any logarithmic scale.',
      'The acoustic frequency in hertz divided directly by the corresponding sound wavelength.',
    ],
    notes: [
      'Decibels use a logarithmic ratio rather than a linear difference, and power ratios—not linear pascal differences—use a factor of ten.',
      'Squaring a pressure ratio yields an intensity ratio, yet converting to decibels still requires taking the base-10 logarithm.',
      'Multiplying frequency by wavelength equals sound speed; dividing frequency by wavelength does not produce a decibel level.',
    ],
  },
  {
    id: 'AU0.7',
    correct: 'Sound pressure level decreases by about 6 dB.',
    distractors: [
      'Sound pressure level increases by about 6 dB.',
      'Sound pressure level drops by exactly 20 dB.',
      'Sound pressure level stays unchanged across distance.',
    ],
    notes: [
      'Moving farther from a point source spreads acoustic energy over a larger area, reducing rather than raising sound pressure level.',
      'A 20 dB drop corresponds to a tenfold increase in distance under free-field conditions rather than simply doubling distance.',
      'In a free field, spherical spreading attenuates sound inversely with distance, so level falls rather than staying constant.',
    ],
  },
  {
    id: 'AU0.8',
    correct: 'Wavelength decreases because wavelength equals the speed of sound divided by acoustic frequency.',
    distractors: [
      'Wavelength increases proportionally as frequency rises while acoustic propagation speed stays fixed.',
      'Wavelength stays completely independent of frequency whenever sound travels through uniform room air.',
      'The speed of sound drops toward zero as high-frequency tones oscillate more rapidly through air.',
    ],
    notes: [
      'Frequency and wavelength vary inversely at constant sound speed, so higher-frequency tones always have shorter wavelengths.',
      'Because wavelength equals speed divided by frequency, altering frequency directly changes the spatial length of each wave cycle.',
      'Acoustic propagation speed depends on the medium’s properties such as air temperature rather than falling as frequency rises.',
    ],
  },
  {
    id: 'AU0.9',
    correct: 'Calibration verifies traceable output, while routine checks catch interim equipment, transducer, or room faults.',
    distractors: [
      'Daily listening checks satisfy acoustic output standards and replace annual electroacoustic audiometer calibration.',
      'Passing annual calibration guarantees stable transducer output so daily biological listening checks add no value.',
      'Neither calibration nor routine listening checks are required whenever patient thresholds look clinically plausible.',
    ],
    notes: [
      'Biological checks detect gross distortions, static, or intermittent cords, yet they cannot measure traceable ANSI output precision.',
      'Transducers can drop, cords fray, and rooms get noisy between annual visits, so routine checks protect daily test validity.',
      'Plausible-looking thresholds can still be shifted by miscalibration or faulty earphones, making both safeguards clinically essential.',
    ],
  },
  {
    id: 'AU1.0',
    correct: 'The lowest signal level detected under defined test conditions using a specified response criterion.',
    distractors: [
      'The most comfortable listening level at which everyday conversation feels effortless and clear to the listener.',
      'The upper loudness discomfort level where acoustic signals begin to feel uncomfortably intense or painful.',
      'The presentation level required to guarantee one hundred percent word recognition across noisy environments.',
    ],
    notes: [
      'Most comfortable loudness sits well above minimum audibility and describes preferred suprathreshold listening rather than detection threshold.',
      'Loudness discomfort defines the top edge of the listener’s dynamic range rather than the softest detectable signal level.',
      'Threshold estimates faint sound detection under specified rules rather than predicting perfect suprathreshold speech recognition in noise.',
    ],
  },
  {
    id: 'AU1.1',
    correct: 'Loudness recruitment: unusually rapid loudness growth once sounds exceed an elevated cochlear threshold.',
    distractors: [
      'Conductive attenuation: uniform sound reduction caused by middle-ear fluid blocking acoustic transmission.',
      'Binaural diplacusis: pitch mismatch in which one pure tone sounds different in frequency between ears.',
      'Masking-level release: improved tone detection in noise created by an out-of-phase binaural masker.',
    ],
    notes: [
      'Conductive attenuation reduces soft and loud sounds similarly without producing the compressed dynamic range typical of cochlear loss.',
      'Perceiving the same frequency as different pitches between ears defines diplacusis rather than abnormal loudness growth.',
      'Detecting a tone better due to binaural phase differences describes masking-level difference rather than cochlear loudness recruitment.',
    ],
  },
  {
    id: 'AU1.2',
    correct: 'Masking produced when competing acoustic energy overlaps the target’s cochlear excitation pattern.',
    distractors: [
      'Enhanced loudness perception that occurs when the same quiet sound is presented simultaneously to both ears.',
      'Visual dominance in which lipreading or visual location shifts where a listener perceives an auditory event.',
      'Gradual neural adaptation to a steady tone presented in quiet with no competing background noise present.',
    ],
    notes: [
      'Listening with both ears lowers threshold through binaural summation rather than reducing target detectability via competing energy.',
      'Visual capture describes cross-modal perceptual influence rather than peripheral overlap of competing sound spectra in the cochlea.',
      'Auditory adaptation occurs during sustained stimulation without a masker, whereas energetic masking requires overlapping competing sound.',
    ],
  },
  {
    id: 'AU1.3',
    correct: 'The auditory system processes sound through frequency-selective filters of limited spectral bandwidth.',
    distractors: [
      'Every cochlear site responds with equal sensitivity across the entire audible frequency spectrum simultaneously.',
      'Auditory masking strength depends primarily on visual distraction rather than spectral proximity to the tone.',
      'Critical bands reflect middle-ear stapedius muscle contractions that selectively dampen narrow tone ranges.',
    ],
    notes: [
      'The basilar membrane is tonotopically tuned, so only noise falling near a tone’s auditory filter masks it efficiently.',
      'Energetic masking is governed strongly by spectral overlap inside the critical band rather than by visual attention alone.',
      'The acoustic reflex stiffens middle-ear transmission broadly at low frequencies rather than creating cochlear frequency filters.',
    ],
  },
  {
    id: 'AU1.4',
    correct: 'Interaural timing and phase differences between the two ears.',
    distractors: [
      'High-frequency spectral filtering cues created by the outer pinna.',
      'Interaural sound-level differences created by strong head shadow.',
      'Middle-ear tympanometric peak pressure measured across both canals.',
    ],
    notes: [
      'Pinna spectral notches operate mainly at higher frequencies to resolve front–back and vertical elevation rather than low-frequency azimuth.',
      'Low-frequency sound waves bend easily around the head, leaving minimal head-shadow level contrast compared with timing cues.',
      'Tympanometric peak pressure reflects middle-ear ventilation status and does not serve as a binaural spatial localization cue.',
    ],
  },
  {
    id: 'AU1.5',
    correct: 'Interaural level differences produced by head shadow.',
    distractors: [
      'Low-frequency bone-conduction occlusion in the ear canal.',
      'Middle-ear stapedius acoustic reflex decay over time.',
      'Resting cochlear endocochlear electrical voltage potential.',
    ],
    notes: [
      'The occlusion effect enhances low-frequency bone-conducted sound in an enclosed canal rather than supporting high-frequency localization.',
      'Acoustic reflex decay assesses retrocochlear adaptation of the stapedius reflex rather than binaural spatial hearing cues.',
      'The endocochlear potential supplies electrical energy for cochlear hair-cell transduction rather than encoding horizontal sound location.',
    ],
  },
  {
    id: 'AU1.6',
    correct: 'Speech in noise also relies on suprathreshold processing, binaural cues, cognition, language, and room acoustics.',
    distractors: [
      'Normal pure-tone thresholds predict real-world listening accurately across reverberant and noisy classroom rooms.',
      'Difficulty understanding speech in noise despite good quiet thresholds indicates deliberate nonorganic malingering.',
      'Middle-ear static air pressure alone governs how clearly a listener separates target talkers from background noise.',
    ],
    notes: [
      'Quiet tone detection samples peripheral sensitivity only and often misses suprathreshold, binaural, reverberation, and cognitive listening limits.',
      'Many genuine peripheral, neural, central, and acoustic factors impair speech in noise without implying nonorganic malingering.',
      'Middle-ear pressure affects conductive transmission yet does not capture binaural release, temporal cues, or cognitive speech processing.',
    ],
  },
  {
    id: 'AU1.7',
    correct: 'Auditory, speech, language, and neural systems develop through interacting biology, access, experience, and bonding.',
    distractors: [
      'Human central auditory maturation finishes before birth, leaving early postnatal listening experience largely secondary.',
      'Reduced early hearing access affects spoken vocabulary lists while leaving broader communication development untouched.',
      'Timely early audiologic intervention eliminates individual developmental variability across all infants with hearing loss.',
    ],
    notes: [
      'Central auditory pathways show robust postnatal plasticity driven by meaningful auditory and language access during early childhood.',
      'Hearing access interacts with phonology, syntax, pragmatics, literacy, and social-emotional connection far beyond isolated spoken vocabulary.',
      'Early access strongly improves outcomes yet interacts with etiology, family language, comorbidities, and ongoing individual diversity.',
    ],
  },
  {
    id: 'AU1.8',
    correct: 'Presbycusis, interpreted alongside noise, medical, genetic, cognitive, and personal listening history.',
    distractors: [
      'Acute unilateral conductive hearing loss defined by gradual bilateral high-frequency threshold decline.',
      'Clinically normal hearing requiring no counseling because low-frequency pure-tone thresholds remain strong.',
      'A purely peripheral vestibular balance disorder that carries no implications for speech communication.',
    ],
    notes: [
      'Presbycusis is typically bilateral, gradual, and sensorineural rather than an acute one-sided conductive outer- or middle-ear problem.',
      'High-frequency loss impairs consonant perception and speech in noise substantially even when low frequencies stay near normal.',
      'Age-related sensorineural hearing change directly impacts speech communication and listening effort rather than being purely vestibular.',
    ],
  },
  {
    id: 'AU1.9',
    correct: 'The auditory ability to detect rapid timing changes and brief silent gaps over time.',
    distractors: [
      'The peripheral sensitivity required to detect faint high-frequency pure tones in quiet booths.',
      'The mechanical peak static compliance measured across the tympanic membrane during tympanometry.',
      'The visual cortex capacity to resolve fine spatial detail when reading speechreading cues.',
    ],
    notes: [
      'High-frequency threshold sensitivity reflects spectral audibility rather than how quickly the auditory system tracks rapid timing shifts.',
      'Static acoustic admittance measures middle-ear mobility mechanically and does not characterize rapid central neural timing precision.',
      'Visual spatial acuity belongs to the visual system rather than describing auditory gap detection and temporal tracking.',
    ],
  },
  {
    id: 'AU2.0',
    correct: 'Eliminate or reduce noise at its source using engineering controls before relying solely on earplugs.',
    distractors: [
      'Distribute disposable foam earplugs across the floor right away without measuring or modifying noisy machines.',
      'Shorten annual workplace hearing screening protocols so employees return to loud workstations more quickly.',
      'Wait until serial audiograms confirm permanent threshold shifts before recommending workplace noise abatement.',
    ],
    notes: [
      'Personal hearing protection sits lower in the hierarchy of controls and depends on consistent fit compared with source reduction.',
      'Shortening hearing tests reduces surveillance quality and does nothing to lower hazardous workplace occupational acoustic exposure.',
      'Waiting for permanent threshold shift accepts preventable cochlear damage instead of applying proactive engineering noise prevention.',
    ],
  },
  {
    id: 'AU2.1',
    correct: 'Exposure surveys, engineering and work controls, fitted protection, training, audiometry, and follow-up.',
    distractors: [
      'Annual pure-tone monitoring conducted routinely without implementing workplace noise controls or training.',
      'Bulk distribution of single-size hearing protectors in break rooms without fit verification or staff education.',
      'Individual audiologic counseling offered after employees develop severe permanent noise-induced hearing loss.',
    ],
    notes: [
      'Monitoring detects threshold shifts after exposure occurs yet cannot prevent noise damage without hazard controls and education.',
      'Handing out unverified protectors frequently yields poor real-world attenuation and leaves workers unprotected in hazardous noise.',
      'Waiting for severe loss turns prevention into late rehabilitation rather than protecting workers across the full conservation cycle.',
    ],
  },
  {
    id: 'AU2.2',
    correct: 'Detect clinically meaningful auditory change early to inform medical discussion, communication support, and follow-up.',
    distractors: [
      'Ensure that the prescribing physician halts the potentially ototoxic medication immediately upon any shift.',
      'Diagnose systemic renal or neurological medication side effects independently during audiology appointments.',
      'Replace ongoing physician and oncology treatment management with audiology-directed dosing adjustments.',
    ],
    notes: [
      'Medical teams weigh lifesaving treatment benefits against hearing risks; audiology informs shared medical decisions rather than guaranteeing stoppage.',
      'Systemic medical side effects fall outside audiologic scope and require physician assessment rather than independent audiologic diagnosis.',
      'Medication dosing remains the prescribing physician’s decision, supported collaboratively by timely audiologic baseline and serial data.',
    ],
  },
  {
    id: 'AU2.3',
    correct: 'Match attenuation, fit, comfort, communication needs, gear compatibility, and measured exposure, then verify use.',
    distractors: [
      'Issue the highest labeled attenuation protector to every employee so maximum noise reduction applies universally.',
      'Purchase one universal earplug style assuming standard canal sizes fit workers across the facility comfortably.',
      'Use personal hearing protection in place of evaluating excessive noise levels or feasible engineering controls.',
    ],
    notes: [
      'Over-attenuation can block warning signals and coworker speech, prompting workers to remove protectors in variable noise.',
      'Ear-canal anatomy varies widely; one size often causes discomfort or poor seal, requiring individualized fit verification.',
      'Personal protection complements rather than replaces exposure measurement and higher-tier engineering workplace source noise control reductions.',
    ],
  },
  {
    id: 'AU2.4',
    correct: 'Manage level, duration, distance, recovery, monitoring, and fitted protection while preserving music goals.',
    distractors: [
      'Advise that every sound exposure carries identical cochlear hazard regardless of intensity level or duration.',
      'Reassure musicians that brief post-concert ringing or dullness can be disregarded once quiet returns.',
      'Explain that only industrial occupational noise damages hearing while recreational music remains benign.',
    ],
    notes: [
      'Noise risk depends critically on both intensity and exposure duration, so reducing level, time, or proximity cuts risk.',
      'Temporary tinnitus or threshold shift is an early warning sign of acoustic stress that warrants protective changes.',
      'The cochlea responds to acoustic energy regardless of source, so high-level recreational music poses real hearing-loss risk.',
    ],
  },
  {
    id: 'AU3.0',
    correct: 'The child needs timely follow-up; screening alone does not diagnose hearing-loss type, degree, or cause.',
    distractors: [
      'The failed screening result confirms permanent sensorineural hearing loss in the tested classroom ear.',
      'The screening result establishes that the student requires immediate fitting with personal amplification.',
      'No clinical follow-up is necessary unless the teacher notices severe academic delays later in the term.',
    ],
    notes: [
      'A screen identifies possible risk only and cannot distinguish transient fluid, wax, room noise, or permanent sensorineural loss.',
      'Amplification requires a full diagnostic audiologic evaluation and medical clearance rather than a single screening refer.',
      'Unaddressed hearing differences can affect classroom access and speech perception early, making timely diagnostic follow-up essential.',
    ],
  },
  {
    id: 'AU3.1',
    correct: 'They estimate physiologic auditory-system responses without requiring a conditioned behavioral response.',
    distractors: [
      'They directly measure early receptive language comprehension and emergent phonetic speech recognition.',
      'They determine exact prescriptive hearing-aid gain targets across speech frequencies for immediate fitting.',
      'They eliminate the need for diagnostic audiologic evaluation whenever an infant receives a refer outcome.',
    ],
    notes: [
      'OAE and automated ABR assess peripheral cochlear or neural pathway integrity rather than cognitive language comprehension.',
      'Screening pass/refer outputs do not yield frequency-specific thresholds needed to prescribe or verify hearing-aid amplification settings.',
      'Newborn screening identifies infants needing prompt diagnostic testing rather than replacing comprehensive follow-up audiologic diagnostic confirmation.',
    ],
  },
  {
    id: 'AU3.2',
    correct: 'Arrange prompt diagnostic audiologic evaluation and coordinated EHDI follow-up instead of endless rescreening.',
    distractors: [
      'Wait until the toddler shows observable speech or vocabulary delays before scheduling diagnostic audiology.',
      'Fit bilateral hearing aids right away based on the failed newborn screen so auditory stimulation begins early.',
      'Assume transient middle-ear fluid explains the refer result and schedule another routine screening next year.',
    ],
    notes: [
      'Waiting for spoken-language delay sacrifices critical early neurodevelopmental windows that national EHDI timelines aim to protect.',
      'Safe, accurate amplification requires confirmed frequency-specific diagnostic thresholds and physician medical clearance before infant hearing-device fitting.',
      'Repeating screens indefinitely or assuming fluid risks missing permanent hearing loss or auditory neuropathy spectrum disorder.',
    ],
  },
  {
    id: 'AU3.3',
    correct: 'Verify equipment calibration and ambient-noise limits and modify or relocate testing before interpreting data.',
    distractors: [
      'Raise every pure-tone screening intensity level informally without documentation so tones cut through room noise.',
      'Record students tested in the noisy room as passing to prevent inflating unnecessary clinic referral rates.',
      'Proceed unchanged because standard supra-aural screening headphones block low-frequency ambient room noise fully.',
    ],
    notes: [
      'Raising screening levels informally invalidates protocol cutoffs and risks missing genuine mild or low-frequency hearing loss.',
      'Marking unverified screens as passing conceals real hearing barriers and defeats the purpose of school identification.',
      'Supra-aural headphones provide limited low-frequency attenuation, so excessive low-frequency ambient room noise causes frequent false-positive fails.',
    ],
  },
  {
    id: 'AU3.4',
    correct: 'Risk factors can cause later change, so medical, family, or school concerns warrant surveillance.',
    distractors: [
      'Passing a physiologic newborn hearing screen confirms lifelong normal peripheral hearing sensitivity.',
      'Only congenital hearing loss present at birth influences speech, literacy, and classroom academic access.',
      'Caregiver or teacher listening concerns can be set aside whenever hospital newborn records show a pass.',
    ],
    notes: [
      'Genetic, infectious, ototoxic, noise, and middle-ear factors can cause delayed-onset or progressive loss after a newborn pass.',
      'Late-onset and fluctuating losses during childhood still affect language, fatigue, and daily classroom learning access substantially.',
      'Parent and educator concerns are key triggers for prompt diagnostic evaluation regardless of prior newborn screening results.',
    ],
  },
  {
    id: 'AU4.0',
    correct: 'To differentiate conductive, sensorineural, and mixed components of a patient’s hearing loss.',
    distractors: [
      'To diagnose an expressive language disorder independently during a routine audiologic appointment.',
      'To quantify vestibulo-ocular reflex gain across rapid head-impulse balance movements accurately.',
      'To verify real-ear hearing-aid output targets inside the ear canal across soft and loud speech.',
    ],
    notes: [
      'Air–bone comparison characterizes outer/middle-ear versus inner-ear/neural hearing pathways rather than diagnosing receptive or expressive language disorders.',
      'Vestibulo-ocular reflex gain is evaluated with vestibular tools such as vHIT rather than pure-tone air–bone thresholds.',
      'Hearing-aid output verification uses probe-microphone real-ear measurements rather than unassisted pure-tone air- and bone-conduction threshold comparison.',
    ],
  },
  {
    id: 'AU4.1',
    correct: 'Apply contralateral masking whenever cross-hearing is possible so thresholds reflect the test ear.',
    distractors: [
      'Increase the pure-tone signal duration slightly so the test ear has longer to detect the tone clearly.',
      'Accept unmasked thresholds as ear specific whenever the patient points toward the test-ear earphone.',
      'Deliver narrowband masking noise directly into the test ear to sharpen frequency discrimination.',
    ],
    notes: [
      'Longer tone duration does not prevent acoustic energy from crossing the skull to stimulate a better non-test cochlea.',
      'Patients cannot reliably judge which cochlea heard a cross-heard signal, so interaural attenuation rules must govern masking.',
      'Masking noise belongs in the non-test ear to keep it occupied; masking the test ear would obscure the target signal.',
    ],
  },
  {
    id: 'AU4.2',
    correct: 'Check instructions, reliability, language, familiarity, calibration, and test validity instead of accepting mismatch.',
    distractors: [
      'Average the discordant speech and pure-tone values together and finalize the audiogram without retesting.',
      'Assume the calibrated audiometer rules out error and accept the discordant values as an unusual profile.',
      'Diagnose a retrocochlear lesion directly from the better speech threshold without cross-check measures.',
    ],
    notes: [
      'Averaging conflicting measures hides a major cross-check failure that could reflect nonorganic loss, instructions, or calibration faults.',
      'Annual calibration does not rule out interim transducer issues, misunderstanding, or response bias needing immediate investigation.',
      'A speech threshold much better than pure tones raises suspicion of nonorganic loss or test error rather than retrocochlear pathology.',
    ],
  },
  {
    id: 'AU4.3',
    correct: 'Speech recognition for those specific materials under the defined presentation and scoring rules.',
    distractors: [
      'Everyday real-world communication success across reverberant rooms, background talkers, and visual cues.',
      'Static acoustic admittance and middle-ear air pressure measured across the tympanic membrane in quiet.',
      'Electrical cochlear microphonic amplitude generated by outer hair cells in response to acoustic clicks.',
    ],
    notes: [
      'Quiet word lists sample closed controlled recognition and cannot predict complex noisy or audiovisual communication alone.',
      'Middle-ear pressure and admittance are measured with tympanometry rather than suprathreshold behavioral clinical speech-recognition word lists.',
      'Cochlear microphonic potentials are physiologic electrocochleography or ABR responses rather than behavioral suprathreshold word recognition testing.',
    ],
  },
  {
    id: 'AU4.4',
    correct: 'Add a validated speech-in-noise measure and functional report to capture suprathreshold listening demands.',
    distractors: [
      'Repeat standard 226 Hz tympanometry alone to confirm whether middle-ear mobility explains restaurant trouble.',
      'Reassure the client that strong quiet word scores prove no clinically meaningful listening difficulty exists.',
      'Use bone-conduction pure-tone thresholds as the primary outcome measure for everyday noisy communication.',
    ],
    notes: [
      'Tympanometry evaluates middle-ear mechanics and cannot quantify the signal-to-noise ratio loss driving everyday restaurant listening struggle.',
      'Quiet word recognition often ceiling-scores even when listeners experience real suprathreshold listening difficulty in competing noise.',
      'Bone-conduction thresholds measure cochlear sensitivity in quiet rather than functional speech understanding in competing background noise.',
    ],
  },
  {
    id: 'AU4.5',
    correct: 'Condition head turning toward a visual reinforcer to estimate frequency-specific auditory responses.',
    distractors: [
      'Instruct the infant to raise a hand reliably each time a soft pure tone is presented through earphones.',
      'Present recorded adult monosyllabic word-recognition lists and ask the infant to repeat each word aloud.',
      'Rely on caregiver questionnaires alone because infants cannot participate in behavioral hearing testing.',
    ],
    notes: [
      'Conventional hand-raising requires cognitive and motor control beyond infant development, whereas VRA leverages natural head turning.',
      'Adult open-set word repetition exceeds infant speech and language abilities and cannot establish infant frequency-specific thresholds.',
      'Caregiver reports provide vital context yet cannot replace age-appropriate behavioral VRA or objective physiologic threshold testing.',
    ],
  },
];
