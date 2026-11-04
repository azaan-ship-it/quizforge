"""Hand-written social studies, English, computer science, health and arts sets."""
from written import S

MORE = [
S("ss-branches", "Three Branches of Government", "Social Studies", "3–5", "easy", "How the US government is organized.", """
Q | How many branches does the US federal government have? | Three | Two | Four | Five
Q | Which branch makes laws? | Legislative | Executive | Judicial | Military
Q | Which branch carries out and enforces laws? | Executive | Legislative | Judicial | Electoral
Q | Which branch interprets laws? | Judicial | Executive | Legislative | Diplomatic
Q | Congress is made up of the Senate and the… | House of Representatives | Supreme Court | Cabinet | Electoral College
Q | Who leads the executive branch? | The President | The Chief Justice | The Speaker of the House | The Governor
Q | What is the highest court in the United States? | The Supreme Court | The Senate | The District Court | The White House
Q | How many senators does each state have? | Two | One | Depends on population | Four
Q | How many justices sit on the Supreme Court? | Nine | Seven | Twelve | Five
Q | How long is a US President's term? | Four years | Two years | Six years | Eight years
Q | How long is a US Senator's term? | Six years | Two years | Four years | Life
Q | How long is a US Representative's term? | Two years | Four years | Six years | Eight years
Q | What is the system that lets each branch limit the others? | Checks and balances | Federalism | Popular vote | Monarchy
Q | The President can reject a bill with a… | Veto | Filibuster | Pardon | Treaty
Q | Who becomes President if the President can no longer serve? | The Vice President | The Speaker of the House | The Chief Justice | The Secretary of State
T | Supreme Court justices are appointed, not elected.
F | The President can make laws alone without Congress.
Y | What document is called the supreme law of the land? | constitution, the constitution, us constitution
"""),
S("ss-constitution", "The Constitution & Bill of Rights", "Social Studies", "6–8", "medium", "Founding documents and amendments.", """
Q | The first ten amendments to the Constitution are called the… | Bill of Rights | Declaration of Independence | Articles of Confederation | Federalist Papers
Q | Which amendment protects freedom of speech, religion and the press? | First | Second | Fifth | Tenth
Q | Which amendment protects the right to bear arms? | Second | First | Fourth | Eighth
Q | Which amendment protects against unreasonable searches and seizures? | Fourth | First | Sixth | Ninth
Q | "Pleading the Fifth" means using the right against… | Self-incrimination | Unfair fines | Quartering soldiers | Slavery
Q | Which amendment abolished slavery? | 13th | 15th | 19th | 1st
Q | Which amendment gave women the right to vote? | 19th | 13th | 15th | 26th
Q | Which amendment lowered the voting age to 18? | 26th | 19th | 21st | 15th
Q | The Constitution was written in 1787 in… | Philadelphia | Boston | New York City | Washington, D.C.
Q | The Constitution begins with the words… | "We the People" | "Four score and seven years ago" | "When in the course of human events" | "Give me liberty"
Q | The government before the Constitution was based on the… | Articles of Confederation | Magna Carta | Bill of Rights | Mayflower Compact
Q | Sharing power between the national and state governments is called… | Federalism | Monarchy | Checks and balances | Democracy
Q | Which amendment guarantees a speedy and public trial? | Sixth | Second | Third | Tenth
Q | The Eighth Amendment bans… | Cruel and unusual punishment | Free speech | State governments | Taxes
Q | How many amendments does the Constitution have? | 27 | 10 | 33 | 21
T | The Tenth Amendment reserves powers to the states or the people.
F | The Bill of Rights was part of the original Constitution signed in 1787.
Y | Who is known as the "Father of the Constitution"? | james madison, madison
"""),
S("ss-american-revolution", "The American Revolution", "Social Studies", "6–8", "medium", "Causes, battles and people of the Revolution.", """
Q | In what year was the Declaration of Independence adopted? | 1776 | 1787 | 1607 | 1812
Q | Who was the main author of the Declaration of Independence? | Thomas Jefferson | George Washington | Benjamin Franklin | John Adams
Q | Who commanded the Continental Army? | George Washington | Benedict Arnold | Paul Revere | Thomas Paine
Q | The colonists' slogan "No taxation without…" ends with… | Representation | Revolution | Permission | Liberty
Q | The Boston Tea Party protested a tax on… | Tea | Paper | Sugar | Glass
Q | The 1765 tax on printed paper was the… | Stamp Act | Sugar Act | Tea Act | Townshend Acts
Q | Where were the first shots of the Revolution fired? | Lexington and Concord | Yorktown | Saratoga | Bunker Hill
Q | Which battle was the turning point that brought France in as an ally? | Saratoga | Yorktown | Trenton | Lexington
Q | Where did the British surrender in 1781? | Yorktown | Boston | Philadelphia | Valley Forge
Q | Who wrote the pamphlet "Common Sense"? | Thomas Paine | Thomas Jefferson | Patrick Henry | Samuel Adams
Q | Who rode at night to warn that the British were coming? | Paul Revere | John Hancock | Nathan Hale | Alexander Hamilton
Q | Which country was the colonists' most important ally? | France | Spain | Germany | Russia
Q | Where did Washington's army suffer a harsh winter in 1777–78? | Valley Forge | Yorktown | Plymouth | Jamestown
Q | Which treaty officially ended the war in 1783? | Treaty of Paris | Treaty of Versailles | Treaty of Ghent | Treaty of London
Q | Colonists loyal to the British king were called… | Loyalists | Patriots | Minutemen | Federalists
T | The Boston Massacre happened before the Declaration of Independence.
F | The Revolution ended in 1776.
Y | How many original colonies were there? | 13, thirteen
"""),
S("ss-civil-war", "The Civil War & Reconstruction", "Social Studies", "6–8", "hard", "Causes, leaders and turning points.", """
Q | In what years was the Civil War fought? | 1861–1865 | 1776–1783 | 1812–1815 | 1914–1918
Q | Who was President of the United States during the Civil War? | Abraham Lincoln | Andrew Johnson | Ulysses S. Grant | Jefferson Davis
Q | Who was President of the Confederacy? | Jefferson Davis | Robert E. Lee | Stonewall Jackson | John Calhoun
Q | Which general led the Confederate Army of Northern Virginia? | Robert E. Lee | Ulysses S. Grant | William T. Sherman | George McClellan
Q | Where were the first shots of the Civil War fired? | Fort Sumter | Gettysburg | Antietam | Bull Run
Q | The Emancipation Proclamation was issued in… | 1863 | 1861 | 1865 | 1870
Q | Which battle is often called the turning point of the war in the East? | Gettysburg | Fort Sumter | Bull Run | Shiloh
Q | Lincoln's famous short speech at the battlefield cemetery is the… | Gettysburg Address | Emancipation Proclamation | Second Inaugural | House Divided
Q | Where did Lee surrender to Grant in 1865? | Appomattox Court House | Gettysburg | Richmond | Vicksburg
Q | Capturing Vicksburg gave the Union control of the… | Mississippi River | Atlantic coast | Ohio River | Great Lakes
Q | Sherman's March to the Sea went through… | Georgia | Virginia | Texas | Pennsylvania
Q | Who escaped slavery and led others to freedom on the Underground Railroad? | Harriet Tubman | Clara Barton | Susan B. Anthony | Sojourner Truth
Q | The rebuilding of the South after the war is called… | Reconstruction | The Renaissance | Manifest Destiny | Industrialization
Q | Which amendment granted citizenship to all people born in the US? | 14th | 13th | 15th | 19th
Q | Which amendment gave Black men the right to vote? | 15th | 13th | 14th | 19th
T | Lincoln was assassinated shortly after the war ended.
F | The Confederacy's capital was Washington, D.C.
Y | Which general led the Union Army to victory? | ulysses s. grant, ulysses grant, grant, u.s. grant
"""),
S("ss-ancient-egypt", "Ancient Egypt", "Social Studies", "6–8", "easy", "Pharaohs, pyramids and the Nile.", """
Q | Which river was essential to life in ancient Egypt? | The Nile | The Amazon | The Tigris | The Ganges
Q | Egyptian rulers were called… | Pharaohs | Emperors | Caesars | Sultans
Q | The Great Pyramid was built as a… | Tomb for a pharaoh | Palace | Temple for priests | Market
Q | Egyptian picture writing is called… | Hieroglyphics | Cuneiform | Latin | Sanskrit
Q | Which stone helped scholars decode hieroglyphics? | The Rosetta Stone | The Blarney Stone | The Moonstone | The Kaaba
Q | Preserving a body for the afterlife is… | Mummification | Cremation | Excavation | Irrigation
Q | Which young pharaoh's nearly intact tomb was found in 1922? | Tutankhamun | Ramses II | Khufu | Cleopatra
Q | Egyptians wrote on a paper made from… | Papyrus | Bamboo | Silk | Clay tablets
Q | The yearly flooding of the Nile left behind… | Rich, fertile soil | Salt deserts | Gold nuggets | Ice
Q | The statue with a lion's body and a human head at Giza is the… | Great Sphinx | Colossus | Pharos | Parthenon
Q | Who was the last active ruler of ancient Egypt's Ptolemaic dynasty? | Cleopatra VII | Nefertiti | Hatshepsut | Tutankhamun
Q | Which female pharaoh ruled for about 20 years? | Hatshepsut | Cleopatra I | Isis | Nefertari
Q | Egypt is on which continent? | Africa | Asia | Europe | Australia
T | Ancient Egyptians believed in many gods.
F | The pyramids were built in the 1800s.
Y | What river flows north through Egypt? | nile, the nile, nile river
"""),
S("ss-ancient-greece-rome", "Ancient Greece & Rome", "Social Studies", "6–8", "medium", "Democracy, the Republic and the Empire.", """
Q | Which Greek city-state is known as the birthplace of democracy? | Athens | Sparta | Corinth | Troy
Q | Which Greek city-state was famous for its warriors? | Sparta | Athens | Olympia | Delphi
Q | The Olympic Games began in ancient… | Greece | Rome | Egypt | China
Q | Which philosopher taught Plato? | Socrates | Aristotle | Pythagoras | Homer
Q | Who taught Alexander the Great? | Aristotle | Socrates | Plato | Julius Caesar
Q | Who wrote the epic poems the Iliad and the Odyssey? | Homer | Virgil | Sophocles | Herodotus
Q | The temple on the Athenian Acropolis dedicated to Athena is the… | Parthenon | Pantheon | Colosseum | Forum
Q | In the Roman Republic, citizens elected leaders called… | Senators and consuls | Pharaohs | Kings | Shoguns
Q | Who was the first Roman emperor? | Augustus | Julius Caesar | Nero | Constantine
Q | Julius Caesar was assassinated in… | 44 BCE | 476 CE | 753 BCE | 1066 CE
Q | The huge Roman arena for gladiator games is the… | Colosseum | Parthenon | Acropolis | Circus Minimus
Q | Romans built these to carry water to cities: | Aqueducts | Pyramids | Ziggurats | Canals only
Q | The Western Roman Empire fell in… | 476 CE | 44 BCE | 1453 CE | 1066 CE
Q | The language of ancient Rome was… | Latin | Greek | Italian | Hebrew
Q | Which Roman emperor legalized Christianity? | Constantine | Nero | Caligula | Augustus
T | Many English words come from Latin and Greek roots.
F | Rome was destroyed by Mount Vesuvius.
Y | What city was buried by Mount Vesuvius in 79 CE? | pompeii
"""),
S("geo-continents-oceans", "Continents & Oceans", "Geography", "3–5", "easy", "The big pieces of the world map.", """
Q | How many continents are there? | Seven | Five | Six | Eight
Q | What is the largest continent? | Asia | Africa | North America | Europe
Q | What is the smallest continent? | Australia | Europe | Antarctica | South America
Q | What is the largest ocean? | Pacific | Atlantic | Indian | Arctic
Q | What is the smallest ocean? | Arctic | Indian | Southern | Atlantic
Q | Which continent is covered almost entirely by ice? | Antarctica | Europe | Asia | Australia
Q | Brazil is on which continent? | South America | Africa | North America | Europe
Q | Egypt is on which continent? | Africa | Asia | Europe | South America
Q | Canada is on which continent? | North America | Europe | Asia | South America
Q | Which ocean lies between the Americas and Europe/Africa? | Atlantic | Pacific | Indian | Arctic
Q | Which ocean is between Africa and Australia? | Indian | Pacific | Atlantic | Arctic
Q | The imaginary line around the middle of Earth is the… | Equator | Prime Meridian | Tropic of Cancer | Arctic Circle
Q | Lines that run north to south on a map are lines of… | Longitude | Latitude | Altitude | Attitude
Q | The longest river in Africa is the… | Nile | Congo | Niger | Zambezi
Q | The largest hot desert in the world is the… | Sahara | Gobi | Mojave | Kalahari
T | Australia is both a country and a continent.
F | Europe is the largest continent.
Y | What is the tallest mountain above sea level? | mount everest, everest, mt everest, mt. everest
"""),
S("geo-us-regions", "US Geography", "Geography", "3–5", "medium", "Landforms, rivers and regions of the United States.", """
Q | What is the longest river system in the United States? | Missouri–Mississippi | Colorado | Hudson | Rio Grande
Q | Which mountain range runs along the eastern US? | Appalachian Mountains | Rocky Mountains | Sierra Nevada | Cascades
Q | Which mountain range runs through the western US? | Rocky Mountains | Appalachian Mountains | Ozarks | Adirondacks
Q | Which is the largest US state by area? | Alaska | Texas | California | Montana
Q | Which is the smallest US state by area? | Rhode Island | Delaware | Connecticut | Hawaii
Q | Which state is made up entirely of islands? | Hawaii | Florida | Alaska | Maine
Q | The five Great Lakes are Superior, Michigan, Huron, Erie and… | Ontario | Champlain | Tahoe | Salt Lake
Q | Which Great Lake lies entirely within the US? | Lake Michigan | Lake Superior | Lake Erie | Lake Ontario
Q | The Grand Canyon is in which state? | Arizona | Utah | Colorado | Nevada
Q | Which ocean borders the US west coast? | Pacific | Atlantic | Arctic | Indian
Q | Which body of water borders Texas and Florida? | Gulf of Mexico | Hudson Bay | Lake Erie | Chesapeake Bay
Q | Which river forms part of the border between Texas and Mexico? | Rio Grande | Colorado | Mississippi | Columbia
Q | The flat grassland region in the middle of the US is the… | Great Plains | Great Basin | Piedmont | Tidewater
Q | Which state has the most people? | California | Texas | Florida | New York
Q | Mount Rushmore is in which state? | South Dakota | Wyoming | Montana | North Dakota
T | Death Valley, in California, is the lowest point in North America.
F | The Rocky Mountains are older and lower than the Appalachians.
Y | How many states are in the United States? | 50, fifty
"""),
S("ss-world-history-mod", "Modern World History", "Social Studies", "9–12", "hard", "World wars, the Cold War and big turning points.", """
Q | World War I began in… | 1914 | 1939 | 1905 | 1918
Q | The assassination that sparked World War I was of… | Archduke Franz Ferdinand | Kaiser Wilhelm II | Tsar Nicholas II | Otto von Bismarck
Q | World War II in Europe began when Germany invaded… | Poland | France | Russia | Britain
Q | World War II began in… | 1939 | 1914 | 1941 | 1945
Q | The attack that brought the US into World War II was on… | Pearl Harbor | Normandy | Midway | London
Q | The Allied invasion of Normandy on June 6, 1944, is called… | D-Day | V-E Day | Blitzkrieg | Operation Barbarossa
Q | World War II ended in… | 1945 | 1944 | 1918 | 1950
Q | The rivalry between the US and the Soviet Union after WWII was the… | Cold War | Great War | Hundred Years' War | Space Treaty
Q | The Berlin Wall fell in… | 1989 | 1961 | 1991 | 1975
Q | The Soviet Union dissolved in… | 1991 | 1989 | 1945 | 2001
Q | The first artificial satellite, launched in 1957, was… | Sputnik 1 | Apollo 11 | Explorer 1 | Vostok 1
Q | Who was the first person to walk on the Moon? | Neil Armstrong | Buzz Aldrin | Yuri Gagarin | John Glenn
Q | Who led India's nonviolent independence movement? | Mahatma Gandhi | Jawaharlal Nehru | Nelson Mandela | Winston Churchill
Q | Who became South Africa's first Black president in 1994? | Nelson Mandela | Desmond Tutu | Kofi Annan | Thabo Mbeki
Q | The international organization founded in 1945 to keep peace is the… | United Nations | League of Nations | NATO | European Union
T | The Cuban Missile Crisis happened in 1962.
F | The United States and the Soviet Union fought directly in a world war against each other.
Y | Who was British Prime Minister for most of World War II? | winston churchill, churchill
"""),
S("ss-economics", "Economics Basics", "Social Studies", "6–8", "easy", "Supply, demand, money and choices.", """
Q | When demand goes up and supply stays the same, prices usually… | Rise | Fall | Stay exactly the same | Disappear
Q | When supply goes up and demand stays the same, prices usually… | Fall | Rise | Double | Stop
Q | Goods are… | Things you can touch, like food | Actions like haircuts | Taxes | Bank loans
Q | Services are… | Work done for others, like teaching | Physical items | Natural resources | Factories
Q | What you give up when you make a choice is the… | Opportunity cost | Profit | Interest | Tax
Q | Money earned after costs are paid is… | Profit | Revenue | Debt | Inflation
Q | A general rise in prices over time is… | Inflation | Deflation | Profit | Supply
Q | Money a bank pays you for saving is… | Interest | A tax | A fee | A loan
Q | Trading goods without using money is… | Barter | Banking | Budgeting | Borrowing
Q | A plan for spending and saving money is a… | Budget | Loan | Tariff | Stock
Q | Not having enough resources for everything people want is… | Scarcity | Surplus | Profit | Demand
Q | A person who starts a business is an… | Entrepreneur | Employee | Consumer | Economist
Q | A tax on imported goods is a… | Tariff | Dividend | Wage | Budget
T | Producers make goods and services; consumers buy and use them.
F | Scarcity only affects poor countries.
Y | What is the money you earn from working called? | income, wages, wage, pay, salary
"""),
S("ela-parts-of-speech", "Parts of Speech", "English", "3–5", "easy", "Nouns, verbs, adjectives and friends.", """
Q | A person, place, thing or idea is a… | Noun | Verb | Adjective | Adverb
Q | An action or state of being is a… | Verb | Noun | Pronoun | Preposition
Q | A word that describes a noun is an… | Adjective | Adverb | Verb | Conjunction
Q | A word that describes a verb, often ending in -ly, is an… | Adverb | Adjective | Noun | Pronoun
Q | A word that takes the place of a noun is a… | Pronoun | Verb | Preposition | Interjection
Q | Words like "and", "but" and "or" are… | Conjunctions | Prepositions | Adverbs | Nouns
Q | Words like "under", "above" and "between" are… | Prepositions | Conjunctions | Verbs | Adjectives
Q | "Wow!" and "Ouch!" are… | Interjections | Nouns | Verbs | Pronouns
Q | In "The quick dog ran", which word is the adjective? | quick | dog | ran | The
Q | In "She sang loudly", which word is the adverb? | loudly | She | sang | none
Q | In "Maya kicked the ball", which word is the verb? | kicked | Maya | ball | the
Q | In "They went home", which word is the pronoun? | They | went | home | none
Q | Which word is a proper noun? | Chicago | city | river | teacher
Q | Which word is a plural noun? | children | child | childish | childhood
Q | "A", "an" and "the" are called… | Articles | Pronouns | Verbs | Prepositions
T | "Happiness" is a noun.
F | "Quickly" is an adjective.
Y | What part of speech is the word "jump" in "We jump high"? | verb, a verb
"""),
S("ela-figurative", "Figurative Language", "English", "6–8", "medium", "Similes, metaphors, personification and more.", """
Q | A comparison using "like" or "as" is a… | Simile | Metaphor | Hyperbole | Idiom
Q | A comparison that says one thing IS another is a… | Metaphor | Simile | Onomatopoeia | Alliteration
Q | Giving human traits to non-human things is… | Personification | Hyperbole | Simile | Irony
Q | A huge exaggeration is… | Hyperbole | Metaphor | Alliteration | Simile
Q | Words that imitate sounds, like "buzz", are… | Onomatopoeia | Alliteration | Idioms | Metaphors
Q | Repeating the same starting sound, like "Sally sells seashells", is… | Alliteration | Assonance | Rhyme | Hyperbole
Q | "Her smile was as bright as the sun" is a… | Simile | Metaphor | Personification | Idiom
Q | "The classroom was a zoo" is a… | Metaphor | Simile | Hyperbole | Onomatopoeia
Q | "The wind whispered through the trees" is… | Personification | Simile | Alliteration | Hyperbole
Q | "I've told you a million times!" is… | Hyperbole | Metaphor | Personification | Simile
Q | "It's raining cats and dogs" is an… | Idiom | Onomatopoeia | Alliteration | Allusion
Q | A reference to a famous person, place or story is an… | Allusion | Illusion | Idiom | Analogy
Q | When the opposite of what's expected happens, it's… | Irony | Imagery | Rhyme | Tone
Q | Language that appeals to the five senses is… | Imagery | Irony | Theme | Plot
Q | "Crash! Bang! Boom!" is an example of… | Onomatopoeia | Simile | Metaphor | Personification
T | "Time is money" is a metaphor.
F | "As cold as ice" is a metaphor.
Y | What figure of speech compares using "like" or "as"? | simile, a simile
"""),
S("ela-literary-elements", "Literary Elements", "English", "6–8", "medium", "Plot, character, setting, theme and point of view.", """
Q | Where and when a story takes place is the… | Setting | Plot | Theme | Conflict
Q | The sequence of events in a story is the… | Plot | Setting | Mood | Tone
Q | The main character of a story is the… | Protagonist | Antagonist | Narrator only | Author
Q | The character who opposes the main character is the… | Antagonist | Protagonist | Sidekick | Narrator
Q | The turning point or most intense moment of a plot is the… | Climax | Exposition | Resolution | Rising action
Q | The beginning that introduces characters and setting is the… | Exposition | Climax | Falling action | Resolution
Q | The central message or lesson of a story is the… | Theme | Plot | Setting | Conflict
Q | A struggle between opposing forces is the… | Conflict | Theme | Climax | Mood
Q | A story told using "I" is in… | First-person point of view | Third-person point of view | Second-person point of view | Omniscient view
Q | A narrator who knows every character's thoughts is… | Third-person omniscient | First-person | Third-person limited | Unreliable
Q | The feeling a reader gets from a story is the… | Mood | Tone | Theme | Plot
Q | The author's attitude toward the subject is the… | Tone | Mood | Setting | Point of view
Q | Hints about what will happen later are… | Foreshadowing | Flashback | Irony | Imagery
Q | A scene that jumps back to an earlier time is a… | Flashback | Foreshadowing | Climax | Prologue
Q | Character vs. nature is an example of… | External conflict | Internal conflict | Theme | Resolution
T | A character struggling with a hard decision faces internal conflict.
F | The resolution comes before the climax.
Y | What do we call the person who tells the story? | narrator, the narrator
"""),
S("ela-grammar", "Grammar & Punctuation", "English", "6–8", "medium", "Commas, apostrophes and commonly confused words.", """
Q | Which sentence is correct? | Their dog is very friendly. | There dog is very friendly. | They're dog is very friendly. | Thier dog is very friendly.
Q | Which sentence is correct? | It's going to rain today. | Its going to rain today. | Its' going to rain today. | It is's going to rain today.
Q | Which sentence is correct? | You're my best friend. | Your my best friend. | Youre my best friend. | Yore my best friend.
Q | Which is correct? | The dog wagged its tail. | The dog wagged it's tail. | The dog wagged its' tail. | The dog wagged it is tail.
Q | Which word fits? "I have ___ apples than you." | more | most | moreer | much
Q | Which word fits? "She ran ___ than her brother." | faster | fastest | more fast | most fast
Q | Which sentence uses a comma correctly? | I bought apples, oranges, and pears. | I bought, apples oranges and pears. | I, bought apples oranges and pears. | I bought apples oranges, and, pears.
Q | Which is the possessive form of "the students' teacher" for many students? | the students' teacher | the student's' teacher | the studentses teacher | the students teacher's
Q | Which is a complete sentence? | The cat slept in the sun. | Because the cat slept. | Sleeping in the sun. | The cat in the sun.
Q | Two complete sentences joined only by a comma is a… | Comma splice | Fragment | Compound sentence | Clause
Q | Which word fits? "Please give the book to ___." | me | I | myself | mine
Q | Which word fits? "___ and I went to the park." | She | Her | Hers | Herself
Q | Which word fits? "The weather will ___ the game." | affect | effect | affekt | effects
Q | Which is spelled correctly? | separate | seperate | separete | seperete
Q | Which is spelled correctly? | definitely | definately | definitly | defanitely
Q | Which punctuation ends a question? | Question mark | Period | Comma | Semicolon
T | A semicolon can join two related complete sentences.
F | "Alot" is the correct spelling.
Y | What punctuation mark shows possession, as in "Sam's book"? | apostrophe, an apostrophe
"""),
S("ela-roots", "Prefixes, Suffixes & Roots", "English", "6–8", "hard", "Decode word meanings from their parts.", """
Q | The prefix "un-" means… | Not | Again | Before | Under
Q | The prefix "re-" means… | Again | Not | Before | After
Q | The prefix "pre-" means… | Before | After | Against | Many
Q | The prefix "sub-" means… | Under | Over | Across | Around
Q | The prefix "inter-" means… | Between | Inside | Against | Without
Q | The suffix "-less" means… | Without | Full of | One who | The study of
Q | The suffix "-ful" means… | Full of | Without | Able to | Again
Q | The suffix "-ology" means… | The study of | Fear of | Without | Small
Q | The root "bio" means… | Life | Earth | Water | Light
Q | The root "geo" means… | Earth | Life | Time | Sound
Q | The root "graph" means… | Write | Hear | See | Carry
Q | The root "phon" means… | Sound | Light | Love | Fear
Q | The root "tele" means… | Far | Near | Under | Small
Q | The root "port" means… | Carry | Look | Build | Break
Q | The root "aqua" means… | Water | Air | Fire | Land
Q | "Transport" literally means… | Carry across | Look far | Write again | Break apart
Q | "Hydrophobia" literally means… | Fear of water | Love of water | Study of water | Without water
T | "Microscope" comes from roots meaning "small" and "look".
F | The prefix "anti-" means "for" or "in favor of".
Y | What does the prefix "tri-" mean? | three, 3
"""),
S("ela-synonyms", "Synonyms & Antonyms", "English", "3–5", "easy", "Words that mean the same and the opposite.", """
Q | A synonym for "happy" is… | Joyful | Sad | Angry | Tired
Q | A synonym for "big" is… | Enormous | Tiny | Narrow | Short
Q | A synonym for "quick" is… | Rapid | Slow | Lazy | Quiet
Q | A synonym for "begin" is… | Start | Finish | Stop | Pause
Q | A synonym for "brave" is… | Courageous | Scared | Timid | Shy
Q | A synonym for "smart" is… | Intelligent | Silly | Confused | Clumsy
Q | An antonym for "hot" is… | Cold | Warm | Burning | Sunny
Q | An antonym for "ancient" is… | Modern | Old | Historic | Antique
Q | An antonym for "generous" is… | Selfish | Kind | Giving | Helpful
Q | An antonym for "accept" is… | Reject | Receive | Take | Welcome
Q | An antonym for "victory" is… | Defeat | Win | Triumph | Success
Q | An antonym for "difficult" is… | Easy | Hard | Tough | Tricky
Q | Words that sound alike but have different meanings are… | Homophones | Antonyms | Synonyms | Acronyms
Q | Which pair are homophones? | night / knight | hot / cold | big / large | run / ran
T | "Huge" and "gigantic" are synonyms.
F | "Whisper" and "murmur" are antonyms.
Y | What is the opposite of "always"? | never
"""),
S("cs-python-basics", "Python Basics", "Computer Science", "6–8", "medium", "Variables, types, loops and functions in Python.", """
Q | Which keyword defines a function in Python? | def | function | func | define
Q | What does print(3 + 4) show? | 7 | 34 | 3 + 4 | Error
Q | What does print("3" + "4") show? | 34 | 7 | Error | 3 4
Q | What type is the value 3.5? | float | int | str | bool
Q | What type is the value "hello"? | str | int | float | list
Q | What type is True? | bool | str | int | none
Q | What does len("code") return? | 4 | 3 | 5 | "code"
Q | Which loop repeats while a condition is true? | while | for each | repeat | loop
Q | What does range(3) produce? | 0, 1, 2 | 1, 2, 3 | 0, 1, 2, 3 | 3, 2, 1
Q | Which symbol starts a comment in Python? | # | // | /* | --
Q | What is the index of the first item in a list? | 0 | 1 | -1 | first
Q | What does 10 // 3 give in Python? | 3 | 3.33 | 1 | 4
Q | What does 10 % 3 give in Python? | 1 | 3 | 0 | 3.33
Q | Which checks if two values are equal? | == | = | === | equals
Q | What does input() do? | Reads text the user types | Prints text | Ends the program | Opens a file
Q | Which creates a list? | [1, 2, 3] | (1, 2, 3) only | {1: 2} | <1, 2, 3>
T | Python uses indentation to group blocks of code.
F | In Python, variable names can start with a number.
Y | What keyword is used for a choice between two paths, like "___ x > 5:"? | if
"""),
S("cs-web-basics", "HTML & CSS Basics", "Computer Science", "6–8", "easy", "The building blocks of web pages.", """
Q | What does HTML stand for? | HyperText Markup Language | High Tech Modern Language | Home Tool Markup Language | Hyperlink Transfer Main Language
Q | What does CSS stand for? | Cascading Style Sheets | Computer Style System | Creative Style Script | Colorful Sheet Styles
Q | Which language adds interactivity to web pages? | JavaScript | HTML | CSS | SQL
Q | Which tag makes the largest heading? | <h1> | <h6> | <head> | <big>
Q | Which tag makes a paragraph? | <p> | <para> | <text> | <pg>
Q | Which tag makes a link? | <a> | <link> | <href> | <url>
Q | Which tag shows an image? | <img> | <image> | <pic> | <src>
Q | Which attribute holds a link's destination? | href | src | alt | link
Q | Which attribute describes an image for screen readers? | alt | title | src | desc
Q | Which CSS property changes text color? | color | font-color | text-color | fgcolor
Q | Which CSS property changes the background color? | background-color | bgcolor | color-back | fill
Q | In CSS, which selector targets class="box"? | .box | #box | box | *box
Q | In CSS, which selector targets id="main"? | #main | .main | main | @main
Q | Which tag makes a bulleted list? | <ul> | <ol> | <li> | <list>
Q | Which part of a page holds visible content? | <body> | <head> | <meta> | <title>
T | HTML tags usually come in opening and closing pairs.
F | CSS is used to store data in a database.
Y | What tag is used for each item in a list? | li, <li>
"""),
S("cs-hardware", "Computer Hardware & Binary", "Computer Science", "6–8", "medium", "Parts of a computer and how it counts.", """
Q | Which part is the "brain" that runs instructions? | CPU | RAM | Hard drive | Monitor
Q | Which part holds data temporarily while programs run? | RAM | SSD | CPU | Power supply
Q | Which stores files even when the computer is off? | SSD or hard drive | RAM | Cache only | CPU
Q | Which part is especially good at drawing graphics? | GPU | CPU | RAM | NIC
Q | Which is an input device? | Keyboard | Monitor | Speaker | Printer
Q | Which is an output device? | Monitor | Mouse | Microphone | Scanner
Q | The main circuit board connecting all parts is the… | Motherboard | Hard drive | Chipboard | Keyboard
Q | Binary uses only which digits? | 0 and 1 | 0 through 9 | 1 and 2 | A through F
Q | What is 101 in binary as a decimal number? | 5 | 101 | 3 | 6
Q | What is 1000 in binary as a decimal number? | 8 | 1000 | 4 | 16
Q | What is 6 written in binary? | 110 | 101 | 111 | 011
Q | How many bits are in a byte? | 8 | 4 | 16 | 10
Q | Which is the largest? | Terabyte | Gigabyte | Megabyte | Kilobyte
Q | Software that manages a computer's hardware, like Windows, is the… | Operating system | Browser | Compiler | Firmware update
Q | A set of step-by-step instructions to solve a problem is an… | Algorithm | Array | Application | Address
T | Programs must be loaded into memory to run.
F | A monitor is an input device.
Y | What does CPU stand for? | central processing unit
"""),
S("cs-internet-safety", "Internet Safety & Digital Citizenship", "Computer Science", "3–5", "easy", "Staying safe and kind online.", """
Q | Which is the strongest password? | T7#maple!Rocket92 | password123 | yourname | 12345678
Q | A message asking you to "click this link to claim a prize" is likely… | Phishing | A gift from a friend | Always safe | A software update
Q | What should you do if someone is mean to you online? | Tell a trusted adult and block them | Be mean back | Share your password | Ignore it forever and tell no one
Q | Which is safe to share online with strangers? | Your favorite book | Your home address | Your password | Your school schedule
Q | Two-factor authentication adds… | A second step to prove it's you | A second password reminder email | Faster internet | Ads
Q | Bullying that happens online is called… | Cyberbullying | Hacking | Phishing | Streaming
Q | What is a digital footprint? | The trail of information you leave online | A virus | A type of shoe | A password
Q | Before believing something you read online, you should… | Check if the source is trustworthy | Share it right away | Assume it's true | Comment on it
Q | Software that harms or steals from your computer is… | Malware | Firmware | Freeware | Hardware
Q | Using someone else's work without credit is… | Plagiarism | Citing | Sharing | Researching
Q | A URL that starts with https:// means the connection is… | Encrypted | Free | Official government | Virus-free for sure
Q | Should you use the same password for every account? | No | Yes | Only for games | Only for email
T | Things posted online can stay there for a very long time.
F | It's fine to meet someone in person you only know online without telling an adult.
Y | What is the fake-message trick that tries to steal passwords called? | phishing
"""),
S("health-nutrition", "Nutrition & Healthy Habits", "Health", "3–5", "easy", "Food groups, nutrients and staying healthy.", """
Q | Which nutrient is the body's main source of quick energy? | Carbohydrates | Vitamins | Minerals | Water
Q | Which nutrient helps build and repair muscles? | Protein | Sugar | Fiber | Vitamin C
Q | Which food is a good source of protein? | Beans | Lettuce | Apples | Rice cakes
Q | Which food is a good source of calcium? | Milk | Candy | Chips | Soda
Q | Calcium is especially important for strong… | Bones and teeth | Hair | Eyesight | Nails only
Q | Oranges are known for which vitamin? | Vitamin C | Vitamin D | Vitamin K | Vitamin B12
Q | Your skin makes vitamin D using… | Sunlight | Water | Sleep | Exercise only
Q | Fiber helps with… | Digestion | Eyesight | Hearing | Hair growth
Q | Which is the healthiest drink choice most of the time? | Water | Soda | Energy drink | Sweet tea
Q | About how much sleep do kids aged 6–12 need each night? | 9–12 hours | 4–5 hours | 6 hours | 15–18 hours
Q | How long should you scrub your hands when washing them? | At least 20 seconds | 2 seconds | 5 minutes | No scrubbing needed
Q | Exercise that gets your heart pumping is called… | Aerobic exercise | Stretching | Sleeping | Fasting
Q | How long should kids be active each day? | At least 60 minutes | 5 minutes | 10 hours | Once a week
T | Eating a variety of colorful fruits and vegetables is good for you.
F | Skipping breakfast gives you more energy for school.
Y | What should you drink plenty of to stay hydrated? | water
"""),
S("arts-music-theory", "Music Basics", "Arts & Music", "3–5", "medium", "Notes, rhythm, instruments and famous composers.", """
Q | How many lines are on a music staff? | Five | Four | Six | Seven
Q | A whole note gets how many beats in 4/4 time? | Four | One | Two | Three
Q | A half note gets how many beats in 4/4 time? | Two | One | Four | Half a beat
Q | A quarter note gets how many beats in 4/4 time? | One | Two | Four | Half a beat
Q | Which symbol means play loudly? | f (forte) | p (piano) | mp | rest
Q | Which symbol means play softly? | p (piano) | f (forte) | ff | crescendo
Q | A gradual increase in volume is a… | Crescendo | Decrescendo | Staccato | Fermata
Q | The speed of music is called… | Tempo | Pitch | Timbre | Harmony
Q | How high or low a note sounds is its… | Pitch | Tempo | Rhythm | Dynamics
Q | Which family does the violin belong to? | Strings | Woodwinds | Brass | Percussion
Q | Which family does the trumpet belong to? | Brass | Woodwinds | Strings | Percussion
Q | Which family does the flute belong to? | Woodwinds | Brass | Strings | Percussion
Q | Which instrument is a percussion instrument? | Drum | Cello | Clarinet | Tuba
Q | Which composer kept writing music after becoming deaf? | Ludwig van Beethoven | Wolfgang Amadeus Mozart | Johann Sebastian Bach | Frédéric Chopin
Q | The musical alphabet uses letters A through… | G | Z | E | H
T | A rest is a symbol for silence.
F | A piano has only white keys.
Y | What is a group of three or more notes played together called? | chord, a chord
"""),
S("arts-art-history", "Art & Famous Artists", "Arts & Music", "6–8", "medium", "Color theory and the artists who changed art.", """
Q | The three primary colors in traditional painting are… | Red, yellow and blue | Red, green and blue | Orange, green and purple | Black, white and gray
Q | Mixing blue and yellow makes… | Green | Purple | Orange | Brown
Q | Mixing red and blue makes… | Purple | Green | Orange | Pink
Q | Colors opposite each other on the color wheel are… | Complementary | Analogous | Primary | Neutral
Q | Who painted the Mona Lisa? | Leonardo da Vinci | Michelangelo | Raphael | Rembrandt
Q | Who painted the ceiling of the Sistine Chapel? | Michelangelo | Leonardo da Vinci | Donatello | Botticelli
Q | Who painted "The Starry Night"? | Vincent van Gogh | Claude Monet | Pablo Picasso | Salvador Dalí
Q | Which artist is known for Cubism? | Pablo Picasso | Claude Monet | Georgia O'Keeffe | Andy Warhol
Q | Which artist is famous for painting water lilies? | Claude Monet | Edvard Munch | Frida Kahlo | Jackson Pollock
Q | Which Mexican artist is known for her self-portraits? | Frida Kahlo | Georgia O'Keeffe | Mary Cassatt | Yayoi Kusama
Q | Who painted "The Persistence of Memory" with melting clocks? | Salvador Dalí | René Magritte | Pablo Picasso | Henri Matisse
Q | Who is known for pop art soup cans? | Andy Warhol | Roy Lichtenstein | Keith Haring | Jackson Pollock
Q | A painting of fruit, flowers or objects arranged on a table is a… | Still life | Landscape | Portrait | Mural
Q | A large painting made directly on a wall is a… | Mural | Collage | Sketch | Mosaic
Q | Creating the illusion of depth on a flat surface uses… | Perspective | Symmetry | Texture only | Contrast only
T | Warm colors include red, orange and yellow.
F | Sculptures are always flat, two-dimensional art.
Y | Who painted "The Scream"? | edvard munch, munch
"""),
]
