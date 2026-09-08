'use strict';
// AP U.S. Government foundation pilot: option-level feedback for Unit 1
// distractors. Keyed by item id, then by the exact distractor text, so the
// builder can verify that every entry still matches its item. Each note says
// what the option actually means or why the claim is false, then points back
// to the principle the question tests. Original editorial text; no College
// Board prose.
module.exports = {
  'ap-usg-u1-001': {
    'Popular sovereignty': 'Popular sovereignty says authority comes from the people, but the scenario describes the exchange of some freedom for protection, which is the social contract.',
    'Judicial review': 'Judicial review is a court power to strike down unconstitutional acts; it has nothing to do with why people form a government.',
    'Federalism': 'Federalism divides power between national and state governments; the scenario is about the origin of government itself, not its levels.',
  },
  'ap-usg-u1-002': {
    'Elite democracy': 'Elite democracy limits decision-making to a small, informed group; here ordinary residents decide part of the budget directly.',
    'Judicial supremacy': 'Judicial supremacy concerns courts having the final word on constitutional meaning, not citizen participation in budgeting.',
    'Bureaucratic autonomy': 'Bureaucratic autonomy describes agencies acting with little political direction, the opposite of residents voting on spending.',
  },
  'ap-usg-u1-003': {
    'A large republic eliminates all political factions by requiring unanimous agreement among representatives.': 'Madison argued factions cannot be eliminated without destroying liberty; the goal is to control their effects, not to require unanimity.',
    'A large republic makes state governments unnecessary because local interests disappear as territory expands.': 'Federalist No. 10 did not propose abolishing states; it argued more interests across a larger territory make any one faction less likely to dominate.',
    'A large republic protects liberty only when voters are barred from replacing the officials who represent them.': 'The argument relies on elections filtering public views through representatives, so removable officials are part of the design, not a threat to it.',
  },
  'ap-usg-u1-004': {
    'It demonstrated that the national government had an overly powerful executive.': 'The Articles created no separate national executive at all, so the rebellion could not expose an executive that was too strong.',
    'It proved that Congress could directly regulate interstate commerce.': 'Congress under the Articles lacked commerce power; the rebellion revealed weakness, not a regulatory capacity.',
    'It showed that the national courts could easily enforce federal law.': 'There was no national court system under the Articles; enforcement depended on the states, which is why the unrest alarmed nationalists.',
  },
  'ap-usg-u1-005': {
    'It gave every state an identical number of representatives in both chambers regardless of its population.': 'Equal representation applies only to the Senate; the House is apportioned by population, which was the compromise itself.',
    'It replaced congressional representation with direct national voting by citizens on every proposed law.': 'The Constitution is built on representation; no provision lets citizens vote directly on federal laws.',
    'It required the president to be selected by the Supreme Court rather than by electors chosen in the states.': 'Presidential selection runs through the Electoral College; the Court plays no role in choosing the president.',
  },
  'ap-usg-u1-006': {
    'Popular sovereignty without representation': 'A veto and override are actions by elected branches checking each other, not the people acting without representatives.',
    'The supremacy of state constitutions': 'The scenario involves only national institutions; state constitutions are not in play, and federal law is supreme over them anyway.',
    'Direct democracy in the national legislature': 'Congress is a representative body; an override vote by members is a check on the executive, not direct citizen lawmaking.',
  },
  'ap-usg-u1-007': {
    'The Tenth Amendment automatically invalidates every federal law affecting a state.': 'The Tenth Amendment reserves undelegated powers to the states; it does not cancel valid federal laws that touch state interests.',
    'The Senate decides which state laws are constitutional without judicial review.': 'Constitutional conflicts between state and federal law are resolved in courts under the Supremacy Clause, not by a Senate vote.',
    'State law always prevails because states existed before the federal government.': 'Article VI makes valid federal law supreme regardless of which government came first.',
  },
  'ap-usg-u1-008': {
    'Congress may exercise only the powers listed word-for-word in Article I, so implied powers are never valid.': 'McCulloch rejected this strict reading, holding that the Necessary and Proper Clause supports implied powers such as chartering a bank.',
    'States may tax or veto any federal institution that operates within their borders whenever they object to it.': 'The Court held the opposite: Maryland could not tax the national bank because the power to tax is the power to destroy.',
    'The Supreme Court may review only state cases involving criminal law, leaving federal questions to Congress.': 'McCulloch was a civil case about a bank tax; it says nothing limiting the Court to criminal matters.',
  },
  'ap-usg-u1-009': {
    'Federalism requires every policy change to be approved separately by every level of government before it takes effect.': 'Levels of government act within their own authority; a policy does not need approval from all of them, which is what creates alternative venues.',
    'Federalism removes state governments from policy implementation and leaves national agencies as the only venue.': 'States carry out much national policy and make their own; that shared role is why groups can lobby at either level.',
    'Federalism gives courts exclusive control over public policy, so advocacy outside litigation cannot succeed.': 'Courts resolve disputes; legislatures and executives at both levels make and implement policy, and groups can approach any of them.',
  },
  'ap-usg-u1-010': {
    'It establishes a lifetime national judiciary with power to veto legislation.': 'The Declaration creates no institutions; the judiciary comes from Article III of the Constitution, and courts do not veto bills.',
    'It gives Congress exclusive authority over local elections.': 'The Declaration does not assign powers to Congress, and election administration is largely a state responsibility.',
    'It argues that political authority should be inherited through monarchy.': 'The Declaration rejects hereditary rule and grounds legitimacy in the consent of the governed.',
  },
  'ap-usg-u1-011': {
    'Participatory democracy': 'Participatory democracy depends on broad citizen involvement; here most residents do not take part, so the label does not fit.',
    'Direct constitutional review': 'This is not a recognized model of democracy; it mixes judicial review language with a question about who shapes policy.',
    'Majoritarian federalism': 'This is not a model of democracy from the framework; the scenario is about a few leaders deciding, which is elite democracy.',
  },
  'ap-usg-u1-012': {
    'A weak national government would be unable to supervise the local elections held in the states.': 'Brutus feared a strong, distant national government, not a weak one, and local elections were never the concern.',
    'A small republic would create too many competing factions for any legislature to govern.': 'That is closer to Madison’s argument in reverse; Brutus favored small republics as more accountable to citizens.',
    'A national government with separated powers would automatically abolish the states.': 'Brutus worried states would be gradually overshadowed by national power, not automatically abolished by separation of powers.',
  },
  'ap-usg-u1-013': {
    'Congress controlled a permanent national executive with unlimited funds.': 'The Articles created no national executive and gave Congress no independent revenue, which is why debts went unpaid.',
    'Congress had exclusive control over all state courts.': 'State courts remained under state control; the Confederation had no authority over them and no national judiciary.',
    'Congress could regulate every interstate trade dispute without limitation.': 'Congress lacked commerce power under the Articles, and trade disputes among states went unresolved.',
  },
  'ap-usg-u1-014': {
    'It eliminated the need for a written Constitution.': 'The Bill of Rights amended the written Constitution; it depended on that document rather than replacing it.',
    'It transferred all federal powers to state legislatures.': 'The amendments limit national power in specific ways; they do not hand federal powers to the states.',
    'It guaranteed that the president would be selected by direct popular vote.': 'Presidential selection through the Electoral College was untouched by the Bill of Rights.',
  },
  'ap-usg-u1-015': {
    'The Senate votes on whether to confirm a presidential nominee to a seat on a federal court.': 'Confirmation is one branch checking another, which is checks and balances rather than the basic division of functions.',
    'The Supreme Court reviews an act of Congress and declares the statute unconstitutional.': 'Judicial review is a check by the courts on the legislature, not the assignment of separate functions to separate branches.',
    'Congress votes to override a presidential veto by a two-thirds majority in both chambers.': 'An override is a legislative check on the executive; the question asks for the underlying division of powers instead.',
  },
  'ap-usg-u1-016': {
    'Coining national currency and setting the value of money used throughout the United States': 'Coining money is an enumerated national power in Article I, and states are expressly barred from it.',
    'Negotiating treaties with foreign governments and appointing ambassadors to represent the nation': 'Treaty making belongs to the president with Senate consent; states may not enter treaties.',
    'Declaring war on another country and raising the armed forces that would conduct it': 'Only Congress may declare war; this is a national power, not one reserved to the states.',
  },
  'ap-usg-u1-017': {
    'The Appointments Clause': 'The Appointments Clause governs how federal officers are chosen and says nothing about regulating markets.',
    'The Treaty Clause': 'The Treaty Clause concerns agreements with foreign nations, not domestic regulation of interstate activity.',
    'The Establishment Clause': 'The Establishment Clause limits government involvement with religion and is unrelated to commerce.',
  },
  'ap-usg-u1-018': {
    'A treaty': 'A treaty is an agreement with a foreign nation ratified by the Senate; it is not a funding arrangement between Washington and the states.',
    'An executive privilege claim': 'Executive privilege is a president’s claim to withhold information; it has no connection to highway money.',
    'A judicial writ of certiorari': 'Certiorari is the Supreme Court’s order to review a lower-court case, not a tool of intergovernmental finance.',
  },
  'ap-usg-u1-101': {
    'Popular sovereignty requires every policy to be decided by a referendum.': 'Popular sovereignty means authority rests with the people; it does not require direct votes, and the charter is about limits on power, not procedure.',
    'Federalism gives local governments complete independence from constitutional limits.': 'Federalism divides power but never frees any level of government from constitutional limits; the charter is imposing limits, not removing them.',
    'Elite democracy requires policy to be made by a small group of experts.': 'The charter says nothing about who makes policy; it restricts what any government may do, which is the natural-rights idea.',
  },
  'ap-usg-u1-102': {
    'It is exclusively an elite democracy because citizens never influence policy.': 'Citizens can propose statutes directly, so they plainly influence policy; that participatory feature rules out an elite-only description.',
    'It is a direct monarchy because elected legislators retain authority.': 'Elected legislators are the opposite of a monarch; representation is a feature of republican government.',
    'It eliminates the need for political parties or organized interests.': 'Initiatives add a participatory channel; parties and groups still organize both elections and initiative campaigns.',
  },
  'ap-usg-u1-103': {
    'The proposal would require equal state representation in both of the chambers of Congress.': 'Warrantless searches have nothing to do with how Congress is apportioned; the concern is government power against individual rights.',
    'The proposal would transfer all of the reserved powers directly to state governments.': 'The proposal expands search authority; it does not move powers between national and state governments.',
    'The proposal would make the Electoral College allocation proportional in every state.': 'Presidential elections are unrelated to a search rule; the issue is limited government and the Fourth Amendment.',
  },
  'ap-usg-u1-104': {
    'Congress controlled a unified national tax system along with permanent executive agencies.': 'The Articles gave Congress neither taxing power nor an executive; requests for money went to the states.',
    'The national judiciary could invalidate every economic regulation that any state adopted.': 'There was no national judiciary under the Articles, so no court could strike down state trade rules.',
    'The president could impose national tariffs without seeking any approval from the legislature.': 'The Confederation had no president; tariffs required state action because Congress could not regulate trade.',
  },
  'ap-usg-u1-105': {
    'The sources prove that the two sides agreed completely about the proper scope of national government.': 'The two sources disagree precisely about scope; one wants stronger national authority and the other warns against it.',
    'The sources show that ratification involved no real disagreement over the institutional design.': 'The Federalist and Anti-Federalist exchange was a disagreement about institutional design, so this reading inverts the evidence.',
    'The sources establish that the Articles created a stronger national executive than the Constitution.': 'The Articles had no executive; the Constitution created one, which is part of what the Anti-Federalists feared.',
  },
  'ap-usg-u1-106': {
    'A state legislature gives an executive agency the authority to administer a new statute.': 'Delegation to an agency exercises government power; it does not show power being confined to legal and constitutional bounds.',
    'A citizen joins a local political party in order to support a candidate for statewide office.': 'Party membership is political participation; it says nothing about limits on what government may do.',
    'A state government uses a local referendum to approve the annual budget for its schools.': 'A referendum is a form of direct democracy; the question asks for government being held within its legal authority.',
  },
  'ap-usg-u1-107': {
    'The state has become a foreign government outside the federal system.': 'Accepting conditioned federal funds is ordinary cooperative federalism; the state remains fully inside the system.',
    'The federal government has abolished all state policymaking authority.': 'The state still implements the program and chooses whether to take the funds, so its authority remains.',
    'The condition demonstrates that the Tenth Amendment forbids all federal grants.': 'Conditional grants are a long-established spending-power tool; the Tenth Amendment does not prohibit them.',
  },
  'ap-usg-u1-108': {
    'States may veto any federal regulation of commerce within their borders.': 'Gibbons held that a valid federal commerce law overrides a conflicting state license; states cannot veto it.',
    'The president may rewrite the Commerce Clause through executive order.': 'Constitutional text cannot be changed by executive order; Gibbons was about congressional power and state conflict.',
    'The Court may regulate commerce directly without a law or dispute.': 'Courts decide cases; they do not regulate commerce on their own, and Gibbons interpreted a congressional statute.',
  },
  'ap-usg-u1-109': {
    'The national government is exercising exclusive control over every state police power.': 'The funding condition leaves the choice to the states; it influences but does not seize their police powers.',
    'The state is using an executive agreement to bind foreign governments.': 'Executive agreements are presidential foreign-policy instruments; a state cannot make one, and none is involved here.',
    'The Supreme Court is applying selective incorporation to a funding dispute.': 'Selective incorporation applies Bill of Rights protections to states; it is unrelated to highway grants.',
  },
  'ap-usg-u1-110': {
    'Judicial supremacy and lifetime judicial appointments': 'The passage is about the people’s right to change government, not about courts or how judges hold office.',
    'Administrative discretion and agency expertise': 'Agency expertise concerns bureaucratic implementation; the passage concerns the source of governmental legitimacy.',
    'Equal state representation in the Senate': 'Senate apportionment is a structural compromise; the passage expresses a principle about consent, not representation formulas.',
  },
  'ap-usg-u1-111': {
    'Elite democracy with no opportunity for citizen input': 'Residents are invited to deliberate, so citizen input is present even though officials decide.',
    'Direct democracy in which every resident votes on every law': 'Residents deliberate but do not vote on laws; final decisions stay with elected officials.',
    'Judicial democracy in which courts set the city budget': 'No court is involved, and courts do not set budgets; the scenario is about participation within representation.',
  },
  'ap-usg-u1-112': {
    'Federalist No. 10 rejects representation entirely, while Brutus No. 1 calls for direct democracy on every public question.': 'Federalist No. 10 relies on representation to refine public views; Brutus favored small republics, not voting on everything.',
    'Both of the sources argue that state governments should be eliminated entirely from the constitutional system under debate.': 'Neither source proposed abolishing states; Brutus defended state authority and Madison kept states within the union.',
    'Both of the sources claim that a large republic guarantees lasting agreement among citizens on every public question at issue.': 'Madison expected persistent disagreement among factions; Brutus doubted a large republic could represent citizens at all.',
  },
  'ap-usg-u1-113': {
    'The table proves that the national government held unlimited taxing authority over states.': 'Requesting funds and receiving less than half shows Congress had to ask; a government with taxing power would collect.',
    'The table shows that the states were required to surrender all of their revenue to Congress.': 'The shortfall shows states kept most of their revenue; nothing compelled them to hand it over.',
    'The table demonstrates that the national judiciary controlled all federal appropriations.': 'No national judiciary existed under the Articles, and the table is about state contributions, not court action.',
  },
  'ap-usg-u1-114': {
    'Convention ratification guaranteed that every state taking part would have an identical population in the census.': 'Ratification procedure cannot change populations; it concerned whose consent the new government rested on.',
    'Convention ratification allowed the president to approve the finished Constitution without any action by states.': 'No president existed before ratification, and approval came from state conventions, not one official.',
    'Convention ratification prevented ordinary citizens from debating the merits of the proposed system of government.': 'Conventions of elected delegates produced extensive debate; that public deliberation was the point.',
  },
  'ap-usg-u1-115': {
    'The sequence proves that the executive branch is superior to the legislature.': 'Signing a bill is a shared step in lawmaking; the court’s later ruling shows no branch is supreme.',
    'The sequence shows that courts can initiate any policy without a case.': 'The Court acted only after a challenge was brought; courts do not start policy on their own.',
    'The sequence demonstrates that states control the federal judiciary.': 'States play no role in the sequence; federal courts are part of the national government.',
  },
  'ap-usg-u1-116': {
    'Only the national government conducts diplomacy with foreign countries.': 'Diplomacy is an exclusive national power, so it is the opposite of a concurrent one.',
    'Only state governments establish local school districts.': 'Creating school districts is a reserved state function, not a power both levels exercise.',
    'Only the Supreme Court may review the constitutionality of a statute.': 'This describes judicial review and is also inaccurate, since lower courts review constitutionality too; it is not a shared federal-state power.',
  },
  'ap-usg-u1-117': {
    'The Court held that Congress may regulate every local activity even without any connection at all to commerce.': 'Lopez did the reverse: it struck down a law because gun possession near a school lacked a sufficient link to interstate commerce.',
    'The Court transferred the power to declare war from Congress to the individual governments of the states.': 'War powers were not at issue; Lopez was a Commerce Clause case about a school-zone gun statute.',
    'The Court ruled that the Necessary and Proper Clause applies only to the legislatures of the several states.': 'The Necessary and Proper Clause empowers Congress; Lopez limited the Commerce Clause without reassigning that clause to states.',
  },
  'ap-usg-u1-118': {
    'The map proves that federal grants eliminate state discretion in every transportation decision that a state makes.': 'A correlation between grants and rule-covered projects cannot show states lost all discretion; states still choose projects and funding.',
    'The map proves that the states receiving fewer grants have no accessibility requirements of any kind now in place.': 'Fewer federally funded projects does not mean no requirements; states may have their own rules, and the map does not measure them.',
    'The map shows that federalism prevents national standards from ever applying to any project funded within a state.': 'The map shows national accessibility rules applying to state projects, so it contradicts this claim.',
  },
  'ap-usg-u1-201': {
    'Judicial review gives the courts authority over every local town budget.': 'Judicial review lets courts strike down unconstitutional acts; it does not give them budget control, and the charter is about consent.',
    'Federalism requires every public decision to be made at the national level.': 'Federalism divides decisions between levels; it never requires national action, and the charter concerns legitimacy, not levels.',
    'Elite democracy limits legitimate authority to a class of property owners.': 'Elite democracy favors a small informed group, not property owners specifically, and the charter grounds authority in all the people.',
  },
  'ap-usg-u1-202': {
    'It is an elite democracy because ordinary voters cannot influence any policy.': 'Voters propose and pass laws by initiative, so they directly influence policy, which contradicts an elite-only description.',
    'It is a confederation because the state courts write all of the laws themselves.': 'A confederation is a league of sovereign states; courts do not write laws, and the scenario describes legislators and voters making them.',
    'It is a monarchy because the representatives all serve fixed terms in office.': 'Fixed elected terms are a republican feature; a monarchy has a hereditary ruler.',
  },
  'ap-usg-u1-203': {
    'The city is balancing equal state representation against the principle of bicameralism in Congress.': 'Senate apportionment and two-chamber design are national structural questions; a warrant rule is about liberty versus order.',
    'The city is balancing the national treaty power against the workings of the Electoral College.': 'Neither treaties nor presidential elections are involved in a local search requirement.',
    'The city is balancing party platforms against the process of congressional reapportionment in states.': 'Parties and redistricting are unrelated; the tension is between privacy rights and effective enforcement.',
  },
  'ap-usg-u1-204': {
    'Congress appointed a national president with the authority to enforce every law without the states.': 'The Articles created no president; the absence of an executive is part of what made national action difficult.',
    'Congress required the state governments to accept a national court ruling in every kind of dispute.': 'No national court system existed under the Articles, so this could not have happened.',
    'Congress collected a nationwide income tax without any participation at all from the state governments.': 'Congress could only request funds from states; it had no power to tax individuals.',
  },
  'ap-usg-u1-205': {
    'A new Constitution would eliminate all political disagreement by ending the state governments entirely.': 'The Constitution preserved the states; ratification supporters promised a union, not the end of state government.',
    'A stronger national structure would make protections for individual rights unnecessary in every case.': 'Federalists argued the structure itself protected liberty, and a Bill of Rights was soon added; rights were never called unnecessary.',
    'Ratification would transfer all of the lawmaking authority to a body of unelected military officers.': 'The Constitution vests lawmaking in an elected Congress and places the military under civilian control.',
  },
  'ap-usg-u1-206': {
    'Unitary government assigns all national functions to one executive office.': 'The scenario shows three distinct branches acting in turn, which is the opposite of concentrating functions in one office.',
    'Direct democracy requires citizens to administer each federal law.': 'Citizens do not administer laws in this scenario; the president does, and the United States is a representative republic.',
    'States may nullify any federal action without a court ruling.': 'Nullification is not a constitutional power, and the scenario shows a federal court, not a state, reviewing the law.',
  },
  'ap-usg-u1-207': {
    'Federalism prevents national laws from ever affecting the administration of elections by states.': 'The example shows a federal law shaping state-run elections, so national law can reach state administration.',
    'Federalism requires that state and national officials hold exactly the same office at once.': 'Federalism keeps the levels distinct; officials serve one government or the other.',
    'Federalism gives local governments exclusive authority over every constitutional right of residents.': 'Constitutional rights bind every level of government; no level has exclusive authority over them.',
  },
  'ap-usg-u1-208': {
    'The states may veto every federal rule simply by invoking their own reserved powers under the Tenth Amendment at any time.': 'Reserved powers do not include a veto over valid federal action; the Supremacy Clause settles that conflict.',
    'Congress may regulate any activity at all without ever identifying a constitutional connection to the activity in question.': 'The court upheld the rule because it rested on an enumerated power; without such a connection Congress could not act.',
    'The courts may decide questions about federalism only in those cases where some state tax revenue happens to be involved.': 'Federalism cases arise across many subjects, including this environmental rule; taxes are not a requirement.',
  },
  'ap-usg-u1-209': {
    'Federalism requires a single petition to resolve every kind of policy dispute that arises.': 'The nonprofit used three venues in sequence, which shows federalism offers several routes rather than one.',
    'Federalism prevents interest groups from using either litigation or legislation at all.': 'The group used both a lawsuit and a request to Congress; both are ordinary paths open to groups.',
    'Federalism makes state agencies entirely independent of every constitutional limit.': 'The agency rule was challenged in federal court precisely because state agencies remain bound by constitutional limits.',
  },
};
