# cognitive agent for research on language, memory, reasoning and learning
# initial focus on developing and testing language encoder and decoder
# encoder uses 

import torch, torchtext, nltk, re, random, math
import torch.nn as nn
import torch.nn.functional as F

from nltk.tokenize import sent_tokenize, word_tokenize
from collections import Counter, OrderedDict

# define the hyper parameters

vocab_size		= 0			# initialised on training data
window_size     = 5         # sliding window on input tokens
back_blend      = 0.5       # feedbackward blend coefficient
d_model			= 512		# model's vector dimension
num_heads		= 4			# number of attention heads
d_hidden	    = 2048	    # dimension of non linear layer
dropout			= 0.1		# fraction of entries to zero
num_blocks	    = 4			# number of transformer blocks
learning_rate	= 1e-3		# initial learning rate (was 1e-4)
epochs			= 50		# number of training epochs
gen_interval	= 5			# epochs per generated example
eval_interval 	= 10		# epochs per validation loss

assert d_model % num_heads == 0, "d_model must be divisible by num_heads"

# manage tensors on best device

device = (
	"cuda" if torch.cuda.is_available()
	else "mps" if torch.backends.mps.is_available()
	else "cpu"
)

torch.set_default_device(device)
print(f"Using {device} device")

# load training and evaluation data from file
# split on newlines and strip blank lines
# split integers into their constituent digits

txt_path = 'data/agent1.txt'

with open(txt_path) as f:
  text = f.read()

print(f"loaded {len(text)} bytes from {txt_path}")

lines = text.lower().split('\n')
samples = [word_tokenize(line) for line in lines if line.strip()]
print(f"{len(samples)} samples")

integer = r'^[0-9]+$'

for i in range(len(samples)):
    sample = samples[i]
    list = []
    for word in sample:
        if re.match(integer, word):
            list.extend(word)
        else:
            list.append(word)
    samples[i] = list
    
for sample in samples:
    print(sample)
    
# samples are now ready, so time to create vocabulary

unk_token = '<unk>'
words = [word for sample in samples for word in sample]
vocab = torchtext.vocab.vocab(OrderedDict([(word, 1) for word in words]), specials=[unk_token])

vocab.set_default_index(-1)
#make default index same as index of unk_token
vocab.set_default_index(vocab[unk_token])
print(f"vocab['out of vocab'] = {vocab['out of vocab']}; vocab['<unk>'] = {vocab['<unk>']}")

vocab_size = len(vocab)  # size of vocabulary

print(f"vocab size is {vocab_size}")

# Transformer block

class Transformer(nn.Module):
	def __init__(self, d_model, num_heads, d_hidden, dropout):
		super(Transformer, self).__init__()
        # for now use built-in PyTorch self attention module
        # plus additional dropouts to encourage generalisation
		self.self_attention = nn.MultiheadAttention(d_model, num_heads, dropout=dropout)
		self.norm1 = nn.LayerNorm(d_model)
		self.dropout1 = nn.Dropout(dropout)
		self.linear1 = nn.Linear(d_model, d_hidden)
		self.linear2 = nn.Linear(d_hidden, d_model)
		self.norm2 = nn.LayerNorm(d_model)
		self.dropout2 = nn.Dropout(dropout)
	
	def forward(self, x, target_mask):
		attn_output, _ = self.self_attention(x, x, x, attn_mask=target_mask)
		x = self.norm1(x + self.dropout1(attn_output))
		ff_output = self.linear2(F.relu(self.linear1(x)))
		x = self.norm2(x + self.dropout2(ff_output))
		return x
	    
# neural module to generate utterance from current state of working memory

class Decoder(nn.Module):
    def __init__(self):
        super(Decoder, self).__init__()
        self.blocks = nn.ModuleList([
        Transformer(d_model, num_heads, d_hidden, dropout)
            for _ in range(num_blocks)
        ])
        self.linear = nn.Linear(d_model, vocab_size)
        self.softmax = nn.LogSoftmax(dim=-1)

    # generate mask to prevent attention to future positions
    def generate_mask(self, sz):
        mask = (torch.triu(torch.ones(sz, sz)) == 1).transpose(0, 1)
        mask = mask.float().masked_fill(mask == 0, float('-inf')).masked_fill(mask == 1, float(0.0))
        return mask

    def forward(self, x):
        for i in range(num_blocks):
            block = self.blocks[i] 
            x = block(x,self.generate_mask(x.size(0)))
        x = self.linear(x)
        return self.softmax(x)
	    
    def firstPosition(self, working_memory):
        # set working memory to first position
        self.memory = working_memory
        assert False, "firstPosition is not implemented"

    def nextPosition(self, ):
        # set working memory to next position
        assert False, "nextPosition is not implemented"
        
    def generate(self, working_memory):
        self.firstPosition(working_memory)
        for _ in range(max_new_tokens):
            logits = self(working_memory) #call forward without targets
            probs = F.softmax(logits, dim=-1)
            data_next = torch.multinomial(probs, num_samples=1)
            data = torch.cat([data, data_next], dim=-1)
            if not self.nextPosition():
                break
        return data

# absolute positional encoding for initial experiments
# expect to switch to relative positions using e.g. RoPE

class PositionalEncoding(nn.Module):
	def __init__(self, d_model, max_len=5000):
		super(PositionalEncoding, self).__init__()

		pe = torch.zeros(max_len, d_model)
		position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
		print(f"position shape is {position.shape}")

		div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
		pe[:, 0::2] = torch.sin(position * div_term)
		pe[:, 1::2] = torch.cos(position * div_term)
		pe = pe.unsqueeze(0).transpose(0, 1)
		print(f"pe shape is {pe.shape}")
		
		self.register_buffer("pe", pe)
	
	def forward(self, x):
		return x + self.pe[:x.size(0), :]
	
# process input text token by token to initialise working memory

class Encoder(nn.Module):
    def __init__(self):
        super(Encoder, self).__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoder = PositionalEncoding(d_model, 10)
        self.clear_retained()
        self.blocks = nn.ModuleList([
        Transformer(d_model, num_heads, d_hidden, dropout)
            for _ in range(num_blocks)
        ])
	
    def forward(self, x):
        print(f"input shape is {x.shape}")
        x = self.embedding(x)
        print(f"embedding1 shape is {x.shape}")
        x = self.pos_encoder(x)
        print(f"embedding2 shape is {x.shape}")
        quit()
        for i in range(num_blocks):
            block = self.blocks[i]
            retained = self.retained[i]
            if retained is not None:
                x = x*(1-back_blend) + retained*back_blend
            #x = block(x, None)
            self.retained[i] = x
        return x
	
    # encoder output holds latent semantics
    def output(self):
        return self.retained[num_blocks -1]

    def clear_retained(self):
        self.retained = [None] * num_blocks

# Cognitive agent with encoder and decoder

class Agent(nn.Module):
    def __init__(self):
        super(Agent, self).__init__()
        self.encoder = Encoder()
        self.decoder = Decoder()
        self.train()
        
    def learn(self, sample):
        print(f"learn on sample: {sample}")
        self.encoder.clear_retained() # clear retained outputs
        print(f"working memory is {self.encoder.output()}")
        for i in range(len(sample)):
            # initialise sliding token window with window_size entries
            # this mimics size constraints of human phonological loop
            window = [None] * window_size
            for j in range(window_size):
                if 0 <= i+j and i+j < len(sample):
                    window[j] = sample[i+j]
            tokens = torch.tensor(vocab(sample), dtype=torch.long)
            self.encoder.forward(tokens)
        self.working_memory = self.encoder.output()
        print(f"working memory is {self.working_memory}")
        print(f"working memory shape is {self.working_memory.shape}")
        quit()
        self.decoder.firstPosition(self.working_memory)
        for i in range(len(sample)):
            logits = self.decoder.forward(encoder.output())
            self.decoder.nextPosition()
        return loss
    
    def clear_retained():
	    self.encoder.clear_retained()
            
agent = Agent() # create instance of Agent class
agent.train() # set it to training mode, use agent.eval() to disable dropouts

# loop over epochs, adjusting the learning rate as we go

for epoch in range(epochs):
    best_loss = float('inf')
    for sample in samples:
        loss = agent.learn(sample)
        if loss < best_loss:
            best_loss = loss
    print(f"epoch {epoch+1} best loss {best_loss}")
    
