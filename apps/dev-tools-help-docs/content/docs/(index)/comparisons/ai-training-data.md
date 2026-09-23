---
title: 📚 Training Datasets
---

![logo](https://i.imgur.com/5HefdGF.png)

![size](https://i.imgur.com/2MzFUil.png)


## What is The Sum of All Knowledge?

    ⭐ Is there enough time to count up all the stars?
    📚 Is there enough time to read the sum of all knowledge?

    🖥️ In servers humming through the endless night,
    🌐 Where 14 TB of human thought reside,
    📖 C4's multilingual web holds digital light,
    📊 While Anna's Archive spans 170 GB wide.

    💾 The Pile sits heavy at 825 GB,
    🧬 Its gigabytes of wisdom, code, and art,
    💻 From PubMed's 194 GB alive
    🔢 To GitHub's 102 GB, each plays its part.

    📡 We measure meaning now in bytes and bits,
    🧠 Wikipedia's 24 GB, a modest sum,
    ⚖️ While massive datasets store what knowledge permits—
    👁️ The fragments of all that we've become.

    🔬 From ArXiv's 121 GB academic dreams
    📚 To OpenWebText's 135 GB refined,
    🤖 Each dataset streams through digital streams,
    ❓ The quantified collective human mind.

    ⏰ The paradox grows clear with every byte:
    🌌 The more we store, the more we comprehend
    🎨 How much remains beyond our finite sight,
    ❤️ How questions birth new questions without end.

    💿 So we collect in terabytes our past,
    🚪 Code algorithms, digitize our dreams—
    🔍 Though time may not allow us to amass
    ✨ The sum of all knowledge, or so it seems.

    🌟 What drives us is infinite curiosity:
    🗝️ Being is becoming, dream is destiny, 
    💖 The boundless library of the imagination,
    🌈 Where every ending opens up a new start.



Data is the most valuable asset in LLM development. When building a dataset, we target the three following characteristics:

* **Accuracy**: Samples should be factually correct and relevant to their corresponding instructions. This can involve using solvers for math and unit tests for code.
* **Diversity**: You want to cover as many use cases as possible to make sure you're never out of distribution. High diversity is essential as it leads to better generalization.
* **Complexity**: Answers should be both detailed (to maximize helpfulness) and include system 2 techniques like chain of thought (to force step-by-step reasoning).

Measuring accuracy is easy in most cases but near-impossible with open-ended, subjective questions. On the other hand, clustering datasets by topic is a good way of evaluating data mixture diversity. Finally, complexity can be assessed using other LLMs acting like judges.

# Text Datasets for Language Model Training

| Dataset | Size | Files/Content | Coverage | Download Links | Notes |
|---------|------|---------------|----------|----------------|-------|
| **Anna's Archive Main Collection** | 170 GB | 20,795,155 files | 99.541% mirrored | [Main Site](https://annas-archive.org/) • [Datasets/Torrents](https://annas-archive.org/datasets) • [Mirror .se](https://annas-archive.se/) • [Mirror .li](https://annas-archive.li/) | Books, papers, magazines, metadata from LibGen, Sci-Hub, Z-Library |
| **C4 Multilingual** | 14.0 TB | 101 languages | Web crawl | [Hugging Face](https://huggingface.co/datasets/allenai/c4) • [Git Clone](https://huggingface.co/datasets/allenai/c4) • [Documentation](https://github.com/allenai/c4-documentation) | Largest multilingual web corpus |
| **C4 English (No Clean)** | 2.3 TB | Raw English | Web crawl | [Hugging Face](https://huggingface.co/datasets/allenai/c4) • [Git Clone](https://huggingface.co/datasets/allenai/c4) | Unfiltered English web content |
| **C4 English (No Blocklist)** | 380 GB | Filtered English | Web crawl | [Hugging Face](https://huggingface.co/datasets/allenai/c4) • [Git Clone](https://huggingface.co/datasets/allenai/c4) | Filtered but no blocklist applied |
| **C4 English (Clean)** | 305 GB | Clean English | Web crawl | [Hugging Face](https://huggingface.co/datasets/allenai/c4) • [Git Clone](https://huggingface.co/datasets/allenai/c4) | Fully filtered and cleaned |
| **The Pile** | 825.18 GB | 22 components | Multi-domain | [Pile Uncopyrighted](https://huggingface.co/datasets/monology/pile-uncopyrighted) • [Academic Torrents](https://academictorrents.com/details/0d366035664fdf51cfbe9f7) • [HF Streaming](https://huggingface.co/datasets/EleutherAI/pile) | EleutherAI |
| **OpenWebText2** | 194 GB | Reddit-curated | Web articles | [Official Docs](https://openwebtext2.readthedocs.io/) • [GitHub](https://github.com/EleutherAI/openwebtext2) • [Hugging Face](https://huggingface.co/datasets/Skylion007/openwebtext) | High-quality web articles |
| **Wikipedia English** | 24 GB | Current pages | Encyclopedia | [Wikimedia Dumps](https://dumps.wikimedia.org/enwiki/) • [Latest Articles](https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles-multistream.xml.bz2) • [HF Legacy](https://huggingface.co/datasets/legacy-datasets/wikipedia) | Reference knowledge base |

## 📅 Open SFT datasets

Once a model has been pre-trained on a next-token prediction task, Supervised Fine-Tuning (SFT) is used to turn it into an assistant capable of answering questions and following instructions. These datasets contain pairs of instructions and outputs to train LLMs to understand conversational structure. Unless otherwise noted, all datasets listed here are under permissive licenses (Apache 2.0, MIT, CC-BY-4.0, etc.).

### General-purpose mixtures

General-purpose datasets offer balanced mixtures of different types of data, including chat, code, and math. These datasets can be used to create general-purpose models that can handle various types of queries.

| Dataset | # | Authors | Date | Notes |
|---------|---|---------|------|-------|
| [Infinity-Instruct](https://huggingface.co/datasets/BAAI/Infinity-Instruct) | 7.45M | BAAI | Aug 2024 | High-quality evolved samples based on a collection of open-source datasets. |
| [WebInstructSub](https://huggingface.co/datasets/chargoddard/WebInstructSub-prometheus) | 2.39M | Yue et al. | May 2024 | Instructions created by retrieving document from Common Crawl, extracting QA pairs, and refining them. See the [MAmmoTH2 paper](https://arxiv.org/abs/2405.03548) and [full set](https://huggingface.co/datasets/TIGER-Lab/WebInstructFull) (13.5M samples). |
| [The-Tome](https://huggingface.co/datasets/arcee-ai/The-Tome) | 1.75M | Arcee AI | Jul 2024 | Reranked and filtered collection of datasets with a focus on instruction following. See my [100k subset](https://huggingface.co/datasets/mlabonne/FineTome-100k). |
| [open-perfectblend](https://huggingface.co/datasets/mlabonne/open-perfectblend) | 1.42M | Xu et al., Labonne | Oct 2024 | Open reproduction of the dataset described [in this paper](https://arxiv.org/abs/2409.20370). It's a solid general-purpose instruction dataset with chat, math, code, and instruction-following data. |
| [smoltalk](https://huggingface.co/datasets/HuggingFaceTB/smoltalk) | 1.1M | Hugging Face | Nov 2024 | Mix of existing and new datasets used to train [SmolLM2](https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct) with proper evaluations. |
| [orca-agentinstruct-1M-v1](https://huggingface.co/datasets/mlabonne/orca-agentinstruct-1M-v1-cleaned) | 1.05M | Microsoft | Nov 2024 | Subset of the AgentInstruct dataset (~25 samples) designed for Orca-3-Mistral, using raw text publicly available on the web as seed data. |
| [tulu3-sft-mixture](https://huggingface.co/datasets/allenai/tulu-3-sft-mixture) | 939k | AI2 | Nov 2024 | (CC-BY-NC-4.0) SFT mixture used to train the [Tulu 3](https://huggingface.co/collections/allenai/tulu-3-models-673b8e0dc3512e30e7dc54f5). It uses public datasets and new synthetic versions, including persona-based answers for diversity. |
| [Open-Platypus](https://huggingface.co/datasets/garage-bAInd/Open-Platypus) | 24.9k | Lee et al. | Sep 2023 | Collection of datasets that were deduplicated using Sentence Transformers (it contains an NC dataset). See [Platypus paper](https://arxiv.org/abs/2308.07317). |

### Math

LLMs often struggle with mathematical reasoning and formal logic, which has led to the creation of specialized datasets. These datasets can include systematic thinking and step-by-step reasoning.

| Dataset | # | Authors | Date | Notes |
|---------|---|---------|------|-------|
| [OpenMathInstruct-2](https://huggingface.co/datasets/nvidia/OpenMathInstruct-2) | 14M | Nvidia | Sep 2024 | Augmented samples from GSM8K and MATH (training set) using Llama-3.1-405B-Instruct. |
| [NuminaMath-CoT](https://huggingface.co/datasets/AI-MO/NuminaMath-CoT) | 859k | Jia Li et al. | July 2024 | Data used to win the first progress prize of the AI Math Olympiad. See the tool-integrated reasoning version [here](https://huggingface.co/datasets/AI-MO/NuminaMath-TIR). |
| [MetaMathQA](https://huggingface.co/datasets/meta-math/MetaMathQA) | 395k | Yu et al. | Dec 2023 | Bootstrap mathematical questions by rewriting them from multiple perspectives. See [MetaMath paper](https://arxiv.org/abs/2309.12284). |
| [MathInstruct](https://huggingface.co/datasets/TIGER-Lab/MathInstruct) | 262k | Yue et al. | Sep 2023 | Compiled from 13 math rationale datasets, six of which are newly curated, and focuses on chain-of-thought and program-of-thought. |
| [Orca-Math](https://huggingface.co/datasets/microsoft/orca-math-word-problems-200k) | 200k | Mitra et al. | Feb 2024 | Grade school math world problems generated using GPT4-Turbo. See [Orca-Math paper](https://arxiv.org/pdf/2402.14830.pdf). |

### Code

Code is another challenging domain for LLMs. Code datasets, containing diverse programming language examples, are used to fine-tune LLMs and enhance their ability to understand, generate, and analyze code.

| Dataset | # | Authors | Date | Notes |
|---------|---|---------|------|-------|
| [opc-sft-stage2](https://huggingface.co/datasets/OpenCoder-LLM/opc-sft-stage2) | 436k | Huang et al. | Nov 2024 | Dataset used in OpenCoder's Stage 2, based on four seed datasets. See [OpenCoder paper](https://arxiv.org/abs/2411.04905). |
| [CodeFeedback-Filtered-Instruction](https://huggingface.co/datasets/m-a-p/CodeFeedback-Filtered-Instruction) | 157k | Zheng et al. | Feb 2024 | Filtered version of Magicoder-OSS-Instruct, ShareGPT (Python), Magicoder-Evol-Instruct, and Evol-Instruct-Code. |
| [Tested-143k-Python-Alpaca](https://huggingface.co/datasets/Vezora/Tested-143k-Python-Alpaca) | 143k | Vezora | Mar 2024 | Collection of generated Python code that passed automatic tests to ensure high quality. |
| [glaive-code-assistant](https://huggingface.co/datasets/glaiveai/glaive-code-assistant) | 136k | Glaive.ai | Sep 2023 | Synthetic data of problems and solutions with ~60% Python samples. Also see the [v2](https://huggingface.co/datasets/glaiveai/glaive-code-assistant-v2) version. |
| [Magicoder-Evol-Instruct-110K](https://huggingface.co/datasets/ise-uiuc/Magicoder-Evol-Instruct-110K) | 110k | Wei et al. | Nov 2023 | A decontaminated version of [evol-codealpaca-v1](https://huggingface.co/datasets/theblackcat102/evol-codealpaca-v1). Decontamination is done in the same way as StarCoder ([bigcode decontamination process](https://github.com/bigcode-project/bigcode-dataset/tree/main/decontamination)). See [Magicoder paper](https://arxiv.org/abs/2312.02120). |
| [synthetic_tex_to_sql](https://huggingface.co/datasets/gretelai/synthetic_text_to_sql) | 100k | Gretel.ai | Apr 2024 | Synthetic text-to-SQL samples (~23M tokens), covering diverse domains. |
| [sql-create-context](https://huggingface.co/datasets/b-mc2/sql-create-context) | 78.6k | b-mc2 | Apr 2023 | Cleansed and augmented version of the [WikiSQL](https://huggingface.co/datasets/wikisql) and [Spider](https://huggingface.co/datasets/spider) datasets. |
| [Code-Feedback](https://huggingface.co/datasets/m-a-p/Code-Feedback) | 66.4k | Zheng et al. | Feb 2024 | Diverse Code Interpreter-like dataset with multi-turn dialogues and interleaved text and code responses. See [OpenCodeInterpreter paper](https://arxiv.org/abs/2402.14658). |
| [Open-Critic-GPT](https://huggingface.co/datasets/Vezora/Open-Critic-GPT) | 55.1k | Vezora | Jul 2024 | Use a local model to create, introduce, and identify bugs in code across multiple programming languages. |
| [self-oss-instruct-sc2-exec-filter-50k](https://huggingface.co/datasets/bigcode/self-oss-instruct-sc2-exec-filter-50k) | 50.7k | Lozhkov et al. | Apr 2024 | Created in three steps with seed functions from TheStack v1, self-instruction with StarCoder2, and self-validation. See the [blog post](https://huggingface.co/blog/sc2-instruct). |

### Instruction following

Instruction following corresponds to the ability to properly follow constraints in the user prompt, such as "write only two paragraphs", "write your answer in French", etc. Strong instruction-following capabilities is a must-have for modern LLMs.

| Dataset | # | Authors | Date | Notes |
|---------|---|---------|------|-------|
| [AutoIF-instruct-61k-with-funcs](https://huggingface.co/datasets/Post-training-Data-Flywheel/AutoIF-instruct-61k-with-funcs) | 61.5k | Diao et al. | Oct 2024 | Samples generated with [this code](https://github.com/shizhediao/Post-Training-Data-Flywheel/tree/main/IF-generation) and gpt-4o-mini, based on Qwen's [AutoIF](https://github.com/QwenLM/AutoIF) library. |
| [ifeval-like-data](https://huggingface.co/datasets/argilla/ifeval-like-data) | 56.3k | Argilla | Oct 2024 | Only use the "filtered" subset. Samples generated by Qwen2.5-72B and verified with lm-evaluation-harness. |
| [tulu-3-sft-personas-instruction-following](https://huggingface.co/datasets/allenai/tulu-3-sft-personas-instruction-following) | 30k | AI2 | Nov 2024 | Synthetic samples created with personas, following the methodology introduced by [Ge et al., 2024](https://arxiv.org/pdf/2406.20094). |

### Multilingual

Learning new languages "from scratch" is a pre-training task, but providing multilingual instruction samples is useful to boost performance in the languages of interest.

| Dataset | # | Authors | Date | Notes |
|---------|---|---------|------|-------|
| [aya dataset](https://huggingface.co/datasets/CohereForAI/aya_dataset) | 204k | Singh et al. | Feb 2024 | Multilingual instruction fine-tuning dataset curated by an open-science community via Aya Annotation Platform. |
| [M2Lingual](https://huggingface.co/datasets/ServiceNow-AI/M2Lingual) | 175K | ServiceNow AI | June 2024 | Dataset spanning 70+ langauges and 20 NLP tasks generated from GPT-4 using task-based taxonomy guided evolutions. More details in [M2Lingual](https://arxiv.org/abs/2406.16783) paper. |

### Agent & Function calling

Function calling allows large language models (LLMs) to execute predefined functions with parameters inferred from user prompts, rather than generating standard text responses. This enables LLMs to seamlessly integrate with external systems, perform complex operations, and provide more accurate and contextually relevant responses.

| Dataset | # | Authors | Date | Notes |
|---------|---|---------|------|-------|
| [glaive-function-calling-v2](https://huggingface.co/datasets/glaiveai/glaive-function-calling-v2) | 113k | Sahil Chaudhary | Sep 2023 | High-quality dataset with pairs of instructions and answers in different languages. See [Locutusque/function-calling-chatml](https://huggingface.co/datasets/Locutusque/function-calling-chatml) for a variant without conversation tags. |
| [xlam-function-calling-60k](https://huggingface.co/datasets/Salesforce/xlam-function-calling-60k) | 60k | Salesforce | Jun 2024 | Samples created using a data generation pipeline designed to produce verifiable data for function-calling applications |
| [Agent-FLAN](https://huggingface.co/datasets/internlm/Agent-FLAN) | 34.4k | internlm | Mar 2024 | Mix of AgentInstruct, ToolBench, and ShareGPT datasets. |
| [hermes-function-calling-v1](https://huggingface.co/datasets/NousResearch/hermes-function-calling-v1) | 11.6k | Nous | Aug 2024 | Compilation of structured output and function calling data used in the Hermes 2 Pro series of models. |
| [ToolACE](https://huggingface.co/datasets/Team-ACE/ToolACE) | 11.3k | Liu et al. | Aug 2024 | Agentic pipeline self-evolution synthesis process to curate a comprehensive API pool |

### Real conversations

Real-world conversations provide valuable insights into how people naturally interact with LLMs, helping us identify the most important use cases and understand typical usage patterns.

| Dataset | # | Authors | Date | Notes |
|---------|---|---------|------|-------|
| [WildChat-1M](https://huggingface.co/datasets/allenai/WildChat-1M) | 1.04M | Zhao et al. | May 2023 | Real conversations between human users and GPT-3.5/4, including metadata. See the [WildChat paper](https://arxiv.org/abs/2405.01470). |
| [lmsys-chat-1m](https://huggingface.co/datasets/lmsys/lmsys-chat-1m) | 1M | LMSYS | Sep 2023 | Real-world conversations with 25 LLMs, collected from 210K unique IP addresses on the Vicuna demo and Chatbot Arena website from April to August 2023. |
| [oasst2](https://huggingface.co/datasets/OpenAssistant/oasst2) | 135k | Köpf et al. | Dec 2023 | Human-generated conversations trees with multiple replies. See [OASST1 paper](https://arxiv.org/abs/2304.07327). |
| [ShareGPT52K](https://huggingface.co/datasets/RyokoAI/ShareGPT52K) | 90k | ShareGPT | Apr 2023 | Conversations scraped via the ShareGPT API before it was shut down. They include both user prompts and responses from GPT-3.5. |
| [oasst1](https://huggingface.co/datasets/OpenAssistant/oasst1) | 84.4k | Köpf et al. | Mar 2023 | Human-generated assistant-style conversation corpus in 35 different languages. See [OASST1 paper](https://arxiv.org/abs/2304.07327). |

## ⚖️ Preference alignment

Unlike instruction data, preference datasets consist of chosen and rejected answers. Preference alignment is used to align LLM's answers with human preferences to adopt the desired style and values.

| Dataset | # | Authors | Date | Notes |
|---------|---|---------|------|-------|
| [Skywork-Reward-Preference-80K-v0.2](https://huggingface.co/datasets/Skywork/Skywork-Reward-Preference-80K-v0.2) | 77k | Skywork | 2024 | Preference pairs compiled from public sources like HelpSteer2, OffsetBias, WildGuard, and Magpie. |
| [ultrafeedback-binarized-preferences-cleaned](https://huggingface.co/datasets/argilla/ultrafeedback-binarized-preferences-cleaned) | 61.1k | Argilla | 2023 | Decontaminated version of the UltraChat dataset, scored by GPT-4 and binarized into "chosen" and "rejected" answers based on these scores. |
| [Infinity-Preference](https://huggingface.co/datasets/BAAI/Infinity-Preference) | 59k | BAAI | Sep 2024 | Adjusts preference attribute weights per task using Infinity-Instruct's labeling system. Each instruction is accompanied by a preference pair sampled from Gemma-2-9B-IT. |
| [Code-Preference-Pairs](https://huggingface.co/datasets/Vezora/Code-Preference-Pairs) | 53k | Vezora | Jul 2024 | Pairs of code examples, where the chosen sample is correct and the rejected one contains a bug. |
| [orpo-dpo-mix-40k](https://huggingface.co/datasets/mlabonne/orpo-dpo-mix-40k) | 44k | Argilla, Labonne | May 2024 | Combination of the following high-quality DPO datasets, mostly from Argilla. |
| [chatbot_arena_conversations](https://huggingface.co/datasets/lmsys/chatbot_arena_conversations) | 33k | LMSYS | Jul 2023 | Cleaned real conversations with pairwise human preferences collected on the [Chatbot Arena](https://lmsys.org/blog/2023-05-03-arena/) from April to June 2023 |
| [tulu-3-pref-personas-instruction-following](https://huggingface.co/datasets/allenai/tulu-3-pref-personas-instruction-following) | 19.9k | AI2 | Nov 2024 | Instruction following data in the form of chosen and rejected answers to teach the model to follow precise constraints. |
| [Human-Like-DPO-Dataset](https://huggingface.co/datasets/HumanLLMs/Human-Like-DPO-Dataset) | 10.9k | Weyaxi | May 2024 | Teach to output more human-like answers instead of the formal slop LLMS usually output. |

# Image Datasets for Visual Model Training

| Dataset | Size & Classes | Main Use Cases | Key Features |
|---------|----------------|----------------|--------------|
| [ImageNet](https://docs.ultralytics.com/datasets/classify/imagenet/) | 14M+ images, 21K+ categories | Classification, detection | Hierarchical structure, ILSVRC benchmark |
| [COCO](https://cocodataset.org) | 328K images, 80 object classes | Detection, segmentation, captioning | Context-rich scenes, multi-object annotations |
| [Open Images](https://storage.googleapis.com/openimages/web/index.html) | 9M images, 20K+ classes | Detection, segmentation, relationships | Large scale, diverse, rich annotations |
| [Pascal VOC](http://host.robots.ox.ac.uk/pascal/VOC/) | 20K+ images, 20 classes | Detection, segmentation | Early benchmark, varied scenes |
| [CIFAR-10/100](https://www.cs.toronto.edu/~kriz/cifar.html) | 60K images, 10/100 classes | Classification | Small images (32x32), lightweight benchmarking |
| [Places](http://places2.csail.mit.edu/) | 2.5M images, 205 scene categories | Scene recognition | Scene-centric, diverse environments |
| [Visual Genome](https://visualgenome.org/) | 108K images | VQA, scene graphs | Dense annotations, object relationships |
| [Cityscapes](https://www.cityscapes-dataset.com/) | 5K images, 30 classes | Urban scene segmentation | High-resolution, pixel-level masks |

## The Pile Component Breakdown (825.18 GB Total)

![stats](https://i.imgur.com/MSTFA0D.png)

### Largest Components (>100 GB)

| Component | Size | Content Type | Domain | Training Weight | Download Links |
|-----------|------|--------------|---------|-----------------|----------------|
| **Pile-CC** | 243.87 GB | Web-crawled Common Crawl subset | Web content | 1.0x | [The Eye](https://the-eye.eu/public/AI/pile_preliminary_components/) • [Academic Torrents](https://academictorrents.com/details/0d366035664fdf51cfbe9f7) |
| **PubMed Central** | 193.86 GB | Biomedical research papers | Scientific | 2.0x | [The Eye PMC](https://the-eye.eu/public/AI/pile_preliminary_components/PMC_extracts.tar.gz) • [Academic Torrents](https://academictorrents.com/details/0d366035664fdf51cfbe9f7) |
| **Books3** | 162.61 GB | Book collection | Literature | 1.0x | ⚠️ Not available separately (copyright) • [Academic Torrents](https://academictorrents.com/details/0d366035664fdf51cfbe9f7) |
| **OpenWebText2** | 134.80 GB | Reddit-linked articles | Web content | 1.0x | [Official Docs](https://openwebtext2.readthedocs.io/) • [GitHub](https://github.com/EleutherAI/openwebtext2) • [Hugging Face](https://huggingface.co/datasets/Skylion007/openwebtext) |
| **ArXiv** | 120.71 GB | Academic preprints | Scientific | 2.0x | [The Eye](https://the-eye.eu/public/AI/pile_preliminary_components/) • [Academic Torrents](https://academictorrents.com/details/0d366035664fdf51cfbe9f7) |
| **GitHub** | 102.18 GB | Code repositories | Programming | 1.0x | [The Eye GitHub](https://the-eye.eu/public/AI/pile_preliminary_components/github.tar) • [Academic Torrents](https://academictorrents.com/details/0d366035664fdf51cfbe9f7) |

### Medium Components (50-100 GB)

| Component | Size | Content Type | Domain | Training Weight | Download Links |
|-----------|------|--------------|---------|-----------------|----------------|
| **FreeLaw** | 82.39 GB | Legal documents | Legal | 1.0x | [The Eye](https://the-eye.eu/public/AI/pile_preliminary_components/) • [Academic Torrents](https://academictorrents.com/details/0d366035664fdf51cfbe9f7) |
| **StackExchange** | 69.14 GB | Q&A discussions | Technical | 1.0x | [The Eye](https://the-eye.eu/public/AI/pile_preliminary_components/) • [Academic Torrents](https://academictorrents.com/details/0d366035664fdf51cfbe9f7) |

### Smaller Components (10-50 GB)

| Component | Size | Content Type | Domain | Training Weight | Download Links |
|-----------|------|--------------|---------|-----------------|----------------|
| **USPTO** | 47.50 GB | Patent documents | Legal/Technical | 1.0x | [The Eye USPTO](