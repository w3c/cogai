# cognitive agent for research on language, memory, reasoning and learning
# initial focus on developing and testing language encoder and decoder

import torch, torchtext, nltk, re, random, math
import torch.nn as nn
import torch.nn.functional as F

from nltk.tokenize import sent_tokenize, word_tokenize
from collections import Counter, OrderedDict

# define the hyper parameters

vocab_size      = 0         # initialised on training data
seq_len         = 64        # maximum sentence length
feedback        = 0         # feedbackward blend factor
d_model         = 512       # model's vector dimension
num_heads       = 4         # number of attention heads
d_hidden        = 2048      # dimension of non linear layer
dropout         = 0.1       # fraction of entries to zero
num_blocks      = 2         # number of transformer blocks
learning_rate   = 1e-3      # initial learning rate (was 1e-4)
epochs          = 50        # number of training epochs
gen_interval    = 5         # epochs per generated example
eval_interval   = 10        # epochs per validation loss

assert 0 <= feedback and feedback < 1, "feedback coefficient must between zero and one"
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
eos_token = '<eos>'
words = [word for sample in samples for word in sample]
vocab = torchtext.vocab.vocab(OrderedDict([(word, 1) for word in words]), specials=[unk_token, eos_token])

vocab.set_default_index(-1)
# make default index same as index of unk_token
vocab.set_default_index(vocab[unk_token])
print(f"vocab['out of vocab'] = {vocab['out of vocab']}; vocab['<unk>'] = {vocab['<unk>']}")
print(f"vocab['<eos>'] = {vocab['<eos>']}")

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
        
# Decoder generates utterance from current state of working memory

class Decoder(nn.Module):
    def __init__(self):
        super(Decoder, self).__init__()
        self.blocks = nn.ModuleList([
            Transformer(d_model, num_heads, d_hidden, dropout)
                for _ in range(num_blocks)
        ])
        self.linear = nn.Linear(d_model, vocab_size)
        self.softmax = nn.LogSoftmax(dim=-1)

    # use mask to prevent attention to future positions
    def generate_mask(self, sz):
        mask = (torch.triu(torch.ones(sz, sz)) == 1).transpose(0, 1)
        mask = mask.float().masked_fill(mask == 0, float('-inf')).masked_fill(mask == 1, float(0.0))
        return mask

    def forward(self, x):
        for block in self.blocks:
            x = block(x, None)
            #x = block(x,self.generate_mask(x.size(0)))
        return self.linear(self.softmax(x))
        
    def generate(self, working_memory):
        for _ in range(max_new_tokens):            
            logits = self(working_memory) #call forward without targets
            probs = self.softmax(x)
            data_next = torch.multinomial(probs, num_samples=1)
            data = torch.cat([data, data_next], dim=-1)
        return data

# absolute positional encoding for initial experiments
# expect to switch to relative positions using e.g. RoPE

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super(PositionalEncoding, self).__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe)
    
    def forward(self, x):
        return x + self.pe[:x.size(0), :]
        
# Encoder maps input tokens to latent semantics
# features retained feedback across Transformer blocks

class Encoder(nn.Module):
    def __init__(self):
        super(Encoder, self).__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoder = PositionalEncoding(d_model, seq_len)
        self.clear_retained()
        self.blocks = nn.ModuleList([
            Transformer(d_model, num_heads, d_hidden, dropout) for _ in range(num_blocks)
        ])
    
    def forward(self, x):
        x = self.embedding(x)
        x = self.pos_encoder(x)
        for i in range(num_blocks):
            block = self.blocks[i]
            x = (1-feedback)*x + feedback*self.retained[i]
            x = block(x, None)
            self.retained[i] = x.clone().detach()   
        return x
        
    def get_retained():
        return self.retained[num_blocks-1]
    
    def clear_retained(self):
        self.retained = [torch.zeros((seq_len, d_model), dtype=torch.long)] * num_blocks
        
# pad line and replace words with tokens for tensor
def prepare_sample(sample):
    words = sample.copy()
    if len(words) > seq_len:
        words = text[0,seq_len]
    if len(words) < seq_len:
        words.append("<eos>")      
    while len(words) < seq_len:
        words.append(" ")
    data = torch.tensor(vocab(words), dtype=torch.long)
    data.detach()
    target = data.clone()
    target.detach()
    return data, target

# Cognitive agent with encoder and decoder

class Agent(nn.Module):
    def __init__(self):
        super(Agent, self).__init__()
        self.encoder = Encoder()
        self.decoder = Decoder()
        #self.test = Test()
        self.train()
        
    def learn(self, sample):
        data, target = prepare_sample(sample)
        optimizer.zero_grad()
        logits = self.decoder(self.encoder(data))
        loss = criterion(logits, target)
        loss.backward()
        optimizer.step()
        return loss
    
    def retained_encoding():
        return self.encoder.get_retained()
        
    def clear_retained():
        self.encoder.clear_retained()
            
agent = Agent() # create instance of Agent class
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(agent.parameters(), lr=0.001)

def count_parameters(model):
	return sum(p.numel() for p in agent.parameters() if p.requires_grad)

print(f"\nThe agent model has {count_parameters(agent):,} trainable parameters\n")


# loop over epochs, adjusting the learning rate as we go

best_loss = float('inf')

for epoch in range(epochs):
    for sample in samples:
        agent.zero_grad()
        loss = agent.learn(sample)
        if loss < best_loss:
            best_loss = loss
    print(f"epoch {epoch+1} best loss {best_loss}, lost {loss}")
