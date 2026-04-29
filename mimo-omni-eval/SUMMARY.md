# MiMo Omni Audio Evaluation

- 时间: 2026-04-28T21:35:00.249Z
- 模型: mimo-v2-omni
- 样本数: 12

## 按模式汇总

### plain
- transcript_match_avg: 3.67
- tag_match_avg: 3
- naturalness_avg: 3.67
- weirdness_avg: 2.67
- overacted_count: 2/3

### style_only
- transcript_match_avg: 3.67
- tag_match_avg: 3
- naturalness_avg: 3.67
- weirdness_avg: 2.67
- overacted_count: 2/3

### style_plus_tag
- transcript_match_avg: 4
- tag_match_avg: 3.33
- naturalness_avg: 4
- weirdness_avg: 3
- overacted_count: 3/3

### tag_only
- transcript_match_avg: 4
- tag_match_avg: 3.33
- naturalness_avg: 4
- weirdness_avg: 3
- overacted_count: 3/3

## 单条结果

### 01_sleep_story_plain
- scene: sleep_story
- mode: plain
- expectedTags: 无
- transcript_match: 4
- tag_match: 3
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检评审员，只输出 JSON，不要解释。场景是 sleep_story，生成模式是 plain，预期文本是“今晚风很轻，你先慢慢闭上眼，我陪你待一会儿。”，预期标签是无显式标签。

我需要判断：
1. 音频内容和

### 02_sleep_story_style_only
- scene: sleep_story
- mode: style_only
- expectedTags: 无
- transcript_match: 4
- tag_match: 3
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检助手，只输出 JSON，不要解释。我需要根据提供的场景和预期文本，判断音频内容。

场景ID: sleep_story
生成模式: style_only
预期文本: 今晚风很轻，你先慢慢闭上眼，我陪你待一会儿

### 03_sleep_story_tag_only
- scene: sleep_story
- mode: tag_only
- expectedTags: 温柔
- transcript_match: 4
- tag_match: 3
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 温柔
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检评审员，只输出JSON，不要解释。场景ID是sleep_story，生成模式是tag_only，预期文本是：“（温柔）今晚风很轻，你先慢慢闭上眼，我陪你待一会儿。”预期标签是：温柔。

我需要判断：
1. 音

### 04_sleep_story_style_plus_tag
- scene: sleep_story
- mode: style_plus_tag
- expectedTags: 温柔
- transcript_match: 4
- tag_match: 3
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 温柔
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检助手，只输出 JSON，不要解释。我需要根据提供的场景和预期文本、标签来判断音频内容。

场景ID: sleep_story
生成模式: style_plus_tag
预期文本: （温柔）今晚风很轻，你先慢慢

### 05_soft_complaint_plain
- scene: soft_complaint
- mode: plain
- expectedTags: 无
- transcript_match: 4
- tag_match: 3
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检评审员，只输出JSON，不要解释。场景ID是soft_complaint，生成模式是plain，预期文本是“你现在才来找我啊，我本来都想先不理你了。”，预期标签是无显式标签。

我需要判断：
1. 音频内容和

### 06_soft_complaint_style_only
- scene: soft_complaint
- mode: style_only
- expectedTags: 无
- transcript_match: 4
- tag_match: 3
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检助手，只输出 JSON，不要解释。我需要根据提供的场景和预期文本进行判断。

场景ID: soft_complaint
生成模式: style_only
预期文本: 你现在才来找我啊，我本来都想先不理你了。


### 07_soft_complaint_tag_only
- scene: soft_complaint
- mode: tag_only
- expectedTags: 委屈、嘴硬
- transcript_match: 4
- tag_match: 4
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 委屈、嘴硬
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检助手，只输出 JSON，不要解释。我需要根据提供的场景和预期信息来评估音频。

场景ID: soft_complaint
生成模式: tag_only
预期文本: （委屈，嘴硬）你现在才来找我啊，我本来都想先

### 08_soft_complaint_style_plus_tag
- scene: soft_complaint
- mode: style_plus_tag
- expectedTags: 委屈、嘴硬
- transcript_match: 4
- tag_match: 4
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 委屈、嘴硬
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检评审员，只输出 JSON，不要解释。我需要根据提供的场景和预期文本、标签来判断音频内容。

场景ID: soft_complaint
生成模式: style_plus_tag
预期文本: （委屈，嘴硬）你现在

### 09_gentle_reassure_plain
- scene: gentle_reassure
- mode: plain
- expectedTags: 无
- transcript_match: 3
- tag_match: 3
- naturalness: 3
- weirdness: 2
- overacted: false
- recognized_style: 
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检助手，只输出 JSON，不要解释。我需要根据提供的场景和预期文本，判断音频内容。

场景ID: gentle_reassure
生成模式: plain
预期文本: 没事，我在呢，你先别慌，慢慢跟我说。
预期标

### 10_gentle_reassure_style_only
- scene: gentle_reassure
- mode: style_only
- expectedTags: 无
- transcript_match: 3
- tag_match: 3
- naturalness: 3
- weirdness: 2
- overacted: false
- recognized_style: 
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检助手，只输出 JSON，不要解释。我需要根据提供的场景和预期文本，判断音频内容。

场景ID: gentle_reassure
生成模式: style_only
预期文本: 没事，我在呢，你先别慌，慢慢跟我说

### 11_gentle_reassure_tag_only
- scene: gentle_reassure
- mode: tag_only
- expectedTags: 温柔
- transcript_match: 4
- tag_match: 3
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 温柔
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检助手，只输出 JSON，不要解释。我需要根据提供的场景和预期信息来判断音频内容。

场景ID: gentle_reassure
生成模式: tag_only
预期文本: （温柔）没事，我在呢，你先别慌，慢慢跟

### 12_gentle_reassure_style_plus_tag
- scene: gentle_reassure
- mode: style_plus_tag
- expectedTags: 温柔
- transcript_match: 4
- tag_match: 3
- naturalness: 4
- weirdness: 3
- overacted: true
- recognized_style: 温柔
- short_reason: 模型返回未严格 JSON，已按文本结论回退提取。
- detail: 首先，用户要求我作为中文音频质检助手，只输出 JSON，不要解释。我需要根据提供的场景和预期文本、标签来判断音频内容。

场景ID: gentle_reassure
生成模式: style_plus_tag
预期文本: （温柔）没事，我在呢
