The "main_cyplex[Age Band].csv" files contain the following columns:

- Word: word form

- Count: Number of times this word form was encountered in all books within this age band

- Zipf_freq: Zipf frequency of this word form, see original manuscript for how this was computed. 
Please note that there is an error in the formula provided in the manuscript.
The Zipf value should be (and was) computed by (1) taking a logarithm (log10) of the ratio of a word's raw frequency (count) plus 1 to the sum of the number of tokens (in millions) and the number of types (in millions) in the corpus, and (2) adding 3 to the result.
The description of the formula provided in the manuscript is correct; however, in the formula itself, the logarithm is missing. No corrigendum was issued with regards to this typo because all values were computed correctly.

- Lemma: Main lemma associated with this word form

- CD_sent_count_logLap: log-transformed count-based contextual diversity measure computed over sentences (count):
the number of sentences across all books in the age band in which the word form appears, with Laplace and log transformtions applied to the raw count

- CD_sent_perc_logLap: CD_sent_count_logLap: log-transformed count-based contextual diversity measure computed over sentences (percentage):
the percentage of sentences across all books in the age band in which the word form appears, with Laplace and log transformtions applied to the raw percentage

- CD_book_count_logLap: log-transformed count-based contextual diversity measure computed over books (count):
the number of books across all books in the age band in which the word form appears, with Laplace and log transformtions applied to the raw count

- CD_book_perc_logLap: log-transformed count-based contextual diversity measure computed over books (percentage):
the percentage of books across all books in the age band in which the word form appears, with Laplace and log transformtions applied to the raw percentage

- CD_sent_count_raw: count-based contextual diversity measure computed over sentences (count):
the number of sentences across all books in the age band in which the word form appears

- CD_sent_perc_raw: count-based contextual diversity measure computed over sentences (percentage):
the precentage of sentences across all books in the age band in which the word form appears

- CD_book_count_raw: count-based contextual diversity measure computed over books (count):
the number of books across all books in the age band in which the word form appears

- CD_book_perc_raw: count-based contextual diversity measure computed over books (percentage):
the precentage of books across all books in the age band in which the word form appears

- AllPoS: all Part-of-Speech tags associated with this word form, separated by dots (.)

- AllPoSFreq: Number of times in which this word form appears as a particular part of speech, separated by dots (.)

- AllPoSLemma: Lemma associated with each specific part of speech, separated by dots (.)

- CPWD_raw: Number of times this word forms appears in the CPWD lexical database (Masterson et al., 2010)

- CPWD_log: log-transformed frequency of this word in CPWD

- CBBC_raw: Number of times this word forms appears in the CBBC subcorpus of SUBTLEX-UK (van Heuven et al., 2014)

- CBBC_log: Zipf frequency of this word in CBBC

- CBeebies_raw: Number of times this word forms appears in the CBeebies subcorpus of SUBTLEX-UK

- CBeebies_log: Zipf frequency of this word in CBeebies

- SubtlexUK_raw: Number of times this word forms appears in the adult subcorpus of SUBTLEX-UK (van Heuven et al., 2014)

- SubtlexUK_log: Zipf frequency of this word in the adult subcorpus of SUBTLEX-UK

- CYPLEX[79/1012/13]_raw: Number of times this word form appears in a different age band in CYP-LEX

- CYPLEX[79/1012/13]_log: Zipf frequency of this word form in a different age band in CYP-LEX

We also provide a "CYPLEX_all_age_bands.csv" file, which contains all measures listed above, but for the entire corpus (i.e., derived from 1,200 books and not age-band specific).

More information about how these measures were computed can be found in the original manuscript:
"The Children and Young People's Books Lexicon (CYP-LEX): A large-scale lexical
database of books read by children and young people in the United Kingdom" (https://doi.org/10.1177/17470218241229694)

Any questions regarding the contents of these files should be directed to Maria Korochkina, maria.korochkina@rhul.ac.uk. 